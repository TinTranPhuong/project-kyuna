/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // Add other env variables here as you create them
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Radix UI Module Declarations
 * Fixes error in image_14b5fe.png
 */
declare module '@radix-ui/react-dropdown-menu' {
  import * as React from 'react';
  export const Root: React.FC<any>;
  export const Trigger: React.ForwardRefExoticComponent<any>;
  export const Portal: React.FC<any>;
  export const Content: React.ForwardRefExoticComponent<any>;
  export const Label: React.FC<any>;
  export const Item: React.ForwardRefExoticComponent<any>;
  export const Separator: React.FC<any>;
}

/**
 * React Syntax Highlighter Declarations
 * Fixes error in image_157cb5.png
 */
declare module 'react-syntax-highlighter' {
  export const Prism: any;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const oneDark: any;
}