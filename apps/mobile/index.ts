// Polyfills first: web3.js needs crypto.getRandomValues and a global Buffer on Hermes.
import "react-native-get-random-values";
import { Buffer } from "buffer";
(global as unknown as { Buffer: typeof Buffer }).Buffer ??= Buffer;

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
