// Asgari React tip tanımları — yalnızca bu ortamda mobil arayüz kodunu tip kontrolünden
// geçirmek için (@types/react indirilemedi). Gerçek projede @types/react kullanılır.
declare namespace React {
  type Key = string | number;
  interface ReactElement { type: unknown; props: unknown; key: Key | null }
  type ReactNode = ReactElement | string | number | bigint | boolean | null | undefined | Iterable<ReactNode>;
  type Dispatch<A> = (value: A) => void;
  type SetStateAction<S> = S | ((prev: S) => S);
  interface Context<T> { Provider: (props: { value: T; children?: ReactNode }) => ReactElement; }
  interface MutableRefObject<T> { current: T }
  function createContext<T>(defaultValue: T): Context<T>;
  function useContext<T>(ctx: Context<T>): T;
  function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  function useCallback<T extends (...args: never[]) => unknown>(fn: T, deps: readonly unknown[]): T;
  function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  function useRef<T>(initial: T): MutableRefObject<T>;
}
declare module 'react' {
  export = React;
}
declare module 'react/jsx-runtime' {
  export namespace JSX {
    type Element = React.ReactElement;
    interface ElementChildrenAttribute { children: {} }
    interface IntrinsicAttributes { key?: React.Key }
    interface IntrinsicElements {}
  }
  export function jsx(type: unknown, props: unknown, key?: React.Key): React.ReactElement;
  export function jsxs(type: unknown, props: unknown, key?: React.Key): React.ReactElement;
  export const Fragment: (props: { children?: React.ReactNode }) => React.ReactElement;
}
