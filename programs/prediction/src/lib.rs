//! Viber Predict Reborn — parimutuel YES/NO prediction markets with SOL collateral.
//! Native Solana program (no Anchor). Byte layouts are mirrored in packages/sdk.

use solana_program::{
    account_info::{next_account_info, AccountInfo},
    clock::Clock,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction, system_program,
    sysvar::Sysvar,
};

entrypoint!(process_instruction);

/// Admin can resolve/void any market at any time and receives the treasury fee.
pub const ADMIN: Pubkey = pubkey!("BK4Tt9kZfazEs3DRzyygpDKP4mN7PyuWduUEJStUPRHc");
pub const FEE_BPS: u64 = 200; // 2%: half to creator, half to treasury
pub const MAX_BET: u64 = 1_000_000_000; // 1 SOL
pub const MIN_BET: u64 = 1_000_000; // 0.001 SOL
pub const MAX_QUESTION: usize = 200;

// Market layout
pub const MARKET_DISC: u8 = 1;
pub const MARKET_SIZE: usize = 282;
const M_BUMP: usize = 1;
const M_STATUS: usize = 2;
const M_OUTCOME: usize = 3;
const M_CREATOR: usize = 4;
const M_ID: usize = 36;
const M_END: usize = 44;
const M_YES: usize = 52;
const M_NO: usize = 60;
const M_CREATED: usize = 68;
const M_BETTORS: usize = 76;
const M_QLEN: usize = 80;
const M_Q: usize = 82;

// Position layout
pub const POSITION_DISC: u8 = 2;
pub const POSITION_SIZE: usize = 84;
const P_BUMP: usize = 1;
const P_CLAIMED: usize = 2;
const P_MARKET: usize = 4;
const P_USER: usize = 36;
const P_YES: usize = 68;
const P_NO: usize = 76;

pub const STATUS_OPEN: u8 = 0;
pub const STATUS_RESOLVED: u8 = 1;
pub const STATUS_VOID: u8 = 2;
pub const YES: u8 = 1;
pub const NO: u8 = 2;

#[repr(u32)]
enum Err {
    InvalidInstruction = 6000,
    QuestionTooLong,
    EndInPast,
    MarketClosed,
    BetOutOfRange,
    BadSide,
    NotAuthorized,
    TooEarly,
    NotSettled,
    AlreadyClaimed,
    NothingToClaim,
    BadAccount,
}
impl From<Err> for ProgramError {
    fn from(e: Err) -> Self {
        ProgramError::Custom(e as u32)
    }
}

fn rd_u64(d: &[u8], o: usize) -> u64 {
    u64::from_le_bytes(d[o..o + 8].try_into().unwrap())
}
fn rd_i64(d: &[u8], o: usize) -> i64 {
    i64::from_le_bytes(d[o..o + 8].try_into().unwrap())
}
fn wr_u64(d: &mut [u8], o: usize, v: u64) {
    d[o..o + 8].copy_from_slice(&v.to_le_bytes());
}
fn rd_pk(d: &[u8], o: usize) -> Pubkey {
    Pubkey::new_from_array(d[o..o + 32].try_into().unwrap())
}

pub fn process_instruction(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let (&tag, rest) = data.split_first().ok_or(Err::InvalidInstruction)?;
    match tag {
        0 => create_market(program_id, accounts, rest),
        1 => place_bet(program_id, accounts, rest),
        2 => resolve(program_id, accounts, rest),
        3 => claim(program_id, accounts),
        4 => void(program_id, accounts),
        _ => Err(Err::InvalidInstruction.into()),
    }
}

/// Creates a PDA even if someone pre-funded its address with lamports.
fn create_pda<'a>(
    payer: &AccountInfo<'a>,
    target: &AccountInfo<'a>,
    system: &AccountInfo<'a>,
    program_id: &Pubkey,
    size: usize,
    seeds: &[&[u8]],
) -> ProgramResult {
    let rent = Rent::get()?.minimum_balance(size);
    let have = target.lamports();
    if have == 0 {
        return invoke_signed(
            &system_instruction::create_account(payer.key, target.key, rent, size as u64, program_id),
            &[payer.clone(), target.clone(), system.clone()],
            &[seeds],
        );
    }
    if have < rent {
        invoke(
            &system_instruction::transfer(payer.key, target.key, rent - have),
            &[payer.clone(), target.clone(), system.clone()],
        )?;
    }
    invoke_signed(&system_instruction::allocate(target.key, size as u64), &[target.clone(), system.clone()], &[seeds])?;
    invoke_signed(&system_instruction::assign(target.key, program_id), &[target.clone(), system.clone()], &[seeds])
}

fn move_lamports(from: &AccountInfo, to: &AccountInfo, amount: u64) -> ProgramResult {
    if amount == 0 {
        return Ok(());
    }
    **from.try_borrow_mut_lamports()? = from.lamports().checked_sub(amount).ok_or(ProgramError::InsufficientFunds)?;
    **to.try_borrow_mut_lamports()? = to.lamports().checked_add(amount).ok_or(ProgramError::ArithmeticOverflow)?;
    Ok(())
}

fn check_market(program_id: &Pubkey, market: &AccountInfo) -> ProgramResult {
    if market.owner != program_id || !market.is_writable {
        return Err(Err::BadAccount.into());
    }
    let d = market.try_borrow_data()?;
    if d.len() != MARKET_SIZE || d[0] != MARKET_DISC {
        return Err(Err::BadAccount.into());
    }
    Ok(())
}

// 0: [id u64][end_ts i64][qlen u16][question]
fn create_market(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let it = &mut accounts.iter();
    let creator = next_account_info(it)?;
    let market = next_account_info(it)?;
    let system = next_account_info(it)?;
    if !creator.is_signer || *system.key != system_program::ID {
        return Err(Err::NotAuthorized.into());
    }
    if data.len() < 18 {
        return Err(Err::InvalidInstruction.into());
    }
    let id = rd_u64(data, 0);
    let end_ts = rd_i64(data, 8);
    let qlen = u16::from_le_bytes([data[16], data[17]]) as usize;
    if qlen == 0 || qlen > MAX_QUESTION || data.len() != 18 + qlen {
        return Err(Err::QuestionTooLong.into());
    }
    let now = Clock::get()?.unix_timestamp;
    if end_ts <= now {
        return Err(Err::EndInPast.into());
    }
    let id_bytes = id.to_le_bytes();
    let (pda, bump) = Pubkey::find_program_address(&[b"market", creator.key.as_ref(), &id_bytes], program_id);
    if pda != *market.key {
        return Err(Err::BadAccount.into());
    }
    if market.owner == program_id {
        return Err(ProgramError::AccountAlreadyInitialized);
    }
    create_pda(creator, market, system, program_id, MARKET_SIZE, &[b"market", creator.key.as_ref(), &id_bytes, &[bump]])?;

    let mut d = market.try_borrow_mut_data()?;
    d[0] = MARKET_DISC;
    d[M_BUMP] = bump;
    d[M_STATUS] = STATUS_OPEN;
    d[M_OUTCOME] = 0;
    d[M_CREATOR..M_CREATOR + 32].copy_from_slice(creator.key.as_ref());
    wr_u64(&mut d, M_ID, id);
    d[M_END..M_END + 8].copy_from_slice(&end_ts.to_le_bytes());
    d[M_CREATED..M_CREATED + 8].copy_from_slice(&now.to_le_bytes());
    d[M_QLEN..M_QLEN + 2].copy_from_slice(&(qlen as u16).to_le_bytes());
    d[M_Q..M_Q + qlen].copy_from_slice(&data[18..]);
    msg!("market created id={}", id);
    Ok(())
}

// 1: [side u8][lamports u64]
fn place_bet(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let it = &mut accounts.iter();
    let user = next_account_info(it)?;
    let market = next_account_info(it)?;
    let position = next_account_info(it)?;
    let system = next_account_info(it)?;
    if !user.is_signer || *system.key != system_program::ID {
        return Err(Err::NotAuthorized.into());
    }
    check_market(program_id, market)?;
    if data.len() != 9 {
        return Err(Err::InvalidInstruction.into());
    }
    let side = data[0];
    let amount = rd_u64(data, 1);
    if side != YES && side != NO {
        return Err(Err::BadSide.into());
    }
    if !(MIN_BET..=MAX_BET).contains(&amount) {
        return Err(Err::BetOutOfRange.into());
    }
    {
        let d = market.try_borrow_data()?;
        if d[M_STATUS] != STATUS_OPEN || Clock::get()?.unix_timestamp >= rd_i64(&d, M_END) {
            return Err(Err::MarketClosed.into());
        }
    }

    let (pda, bump) = Pubkey::find_program_address(&[b"position", market.key.as_ref(), user.key.as_ref()], program_id);
    if pda != *position.key {
        return Err(Err::BadAccount.into());
    }
    let new_position = position.owner != program_id;
    if new_position {
        create_pda(user, position, system, program_id, POSITION_SIZE, &[b"position", market.key.as_ref(), user.key.as_ref(), &[bump]])?;
        let mut p = position.try_borrow_mut_data()?;
        p[0] = POSITION_DISC;
        p[P_BUMP] = bump;
        p[P_MARKET..P_MARKET + 32].copy_from_slice(market.key.as_ref());
        p[P_USER..P_USER + 32].copy_from_slice(user.key.as_ref());
    }

    invoke(
        &system_instruction::transfer(user.key, market.key, amount),
        &[user.clone(), market.clone(), system.clone()],
    )?;

    let off = if side == YES { P_YES } else { P_NO };
    {
        let mut p = position.try_borrow_mut_data()?;
        let v = rd_u64(&p, off).checked_add(amount).ok_or(ProgramError::ArithmeticOverflow)?;
        wr_u64(&mut p, off, v);
    }
    let mut d = market.try_borrow_mut_data()?;
    let moff = if side == YES { M_YES } else { M_NO };
    let v = rd_u64(&d, moff).checked_add(amount).ok_or(ProgramError::ArithmeticOverflow)?;
    wr_u64(&mut d, moff, v);
    if new_position {
        let b = u32::from_le_bytes(d[M_BETTORS..M_BETTORS + 4].try_into().unwrap()).saturating_add(1);
        d[M_BETTORS..M_BETTORS + 4].copy_from_slice(&b.to_le_bytes());
    }
    msg!("bet side={} lamports={}", side, amount);
    Ok(())
}

/// Creator may act after close; admin may act any time.
fn check_authority(authority: &AccountInfo, d: &[u8], allow_creator_early: bool) -> ProgramResult {
    if !authority.is_signer {
        return Err(Err::NotAuthorized.into());
    }
    if *authority.key == ADMIN {
        return Ok(());
    }
    if *authority.key != rd_pk(d, M_CREATOR) {
        return Err(Err::NotAuthorized.into());
    }
    if !allow_creator_early && Clock::get()?.unix_timestamp < rd_i64(d, M_END) {
        return Err(Err::TooEarly.into());
    }
    Ok(())
}

// 2: [outcome u8]
fn resolve(program_id: &Pubkey, accounts: &[AccountInfo], data: &[u8]) -> ProgramResult {
    let it = &mut accounts.iter();
    let authority = next_account_info(it)?;
    let market = next_account_info(it)?;
    check_market(program_id, market)?;
    let outcome = *data.first().ok_or(Err::InvalidInstruction)?;
    if outcome != YES && outcome != NO {
        return Err(Err::BadSide.into());
    }
    let mut d = market.try_borrow_mut_data()?;
    if d[M_STATUS] != STATUS_OPEN {
        return Err(Err::MarketClosed.into());
    }
    check_authority(authority, &d, false)?;
    let win_pool = rd_u64(&d, if outcome == YES { M_YES } else { M_NO });
    d[M_OUTCOME] = outcome;
    // Nobody backed the winning side: refund everyone instead of locking the pool.
    d[M_STATUS] = if win_pool == 0 { STATUS_VOID } else { STATUS_RESOLVED };
    msg!("resolved outcome={} status={}", outcome, d[M_STATUS]);
    Ok(())
}

// 3: accounts user, market, position, creator, treasury
fn claim(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let it = &mut accounts.iter();
    let user = next_account_info(it)?;
    let market = next_account_info(it)?;
    let position = next_account_info(it)?;
    let creator = next_account_info(it)?;
    let treasury = next_account_info(it)?;
    if !user.is_signer {
        return Err(Err::NotAuthorized.into());
    }
    check_market(program_id, market)?;
    if position.owner != program_id || !position.is_writable {
        return Err(Err::BadAccount.into());
    }
    if *treasury.key != ADMIN {
        return Err(Err::BadAccount.into());
    }

    let (status, outcome, yes_pool, no_pool) = {
        let d = market.try_borrow_data()?;
        if *creator.key != rd_pk(&d, M_CREATOR) {
            return Err(Err::BadAccount.into());
        }
        (d[M_STATUS], d[M_OUTCOME], rd_u64(&d, M_YES), rd_u64(&d, M_NO))
    };

    let mut p = position.try_borrow_mut_data()?;
    if p.len() != POSITION_SIZE || p[0] != POSITION_DISC || rd_pk(&p, P_MARKET) != *market.key || rd_pk(&p, P_USER) != *user.key {
        return Err(Err::BadAccount.into());
    }
    if p[P_CLAIMED] != 0 {
        return Err(Err::AlreadyClaimed.into());
    }
    let (yes, no) = (rd_u64(&p, P_YES), rd_u64(&p, P_NO));

    match status {
        STATUS_VOID => {
            let refund = yes.checked_add(no).ok_or(ProgramError::ArithmeticOverflow)?;
            if refund == 0 {
                return Err(Err::NothingToClaim.into());
            }
            p[P_CLAIMED] = 1;
            move_lamports(market, user, refund)?;
            msg!("refund {}", refund);
        }
        STATUS_RESOLVED => {
            let (stake, win_pool) = if outcome == YES { (yes, yes_pool) } else { (no, no_pool) };
            if stake == 0 {
                return Err(Err::NothingToClaim.into());
            }
            let total = yes_pool as u128 + no_pool as u128;
            let gross = (stake as u128 * total / win_pool as u128) as u64;
            let fee = gross * FEE_BPS / 10_000;
            let creator_fee = fee / 2;
            p[P_CLAIMED] = 1;
            move_lamports(market, user, gross - fee)?;
            move_lamports(market, creator, creator_fee)?;
            move_lamports(market, treasury, fee - creator_fee)?;
            msg!("payout {}", gross - fee);
        }
        _ => return Err(Err::NotSettled.into()),
    }
    Ok(())
}

// 4: accounts authority, market
fn void(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    let it = &mut accounts.iter();
    let authority = next_account_info(it)?;
    let market = next_account_info(it)?;
    check_market(program_id, market)?;
    let mut d = market.try_borrow_mut_data()?;
    if d[M_STATUS] != STATUS_OPEN {
        return Err(Err::MarketClosed.into());
    }
    check_authority(authority, &d, true)?;
    d[M_STATUS] = STATUS_VOID;
    msg!("voided");
    Ok(())
}
