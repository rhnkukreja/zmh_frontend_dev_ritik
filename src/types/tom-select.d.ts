// TypeScript declaration override for tom-select to fix build errors
// This file provides a more flexible type definition for tom-select settings

declare module 'tom-select/src/getSettings' {
  export default function getSettings(
    settings_element: any,
    settings_user: any
  ): any;
}

declare module 'tom-select' {
  export * from 'tom-select/dist/types/index';
}
