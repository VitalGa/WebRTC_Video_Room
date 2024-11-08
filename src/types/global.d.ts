export {};

declare global {
  interface Window {
    joinRoom: () => Promise<void>;
  }
}
