// Type definitions for SystemJS 1.6
// Project: https://github.com/stealjs/systemjs
// Definitions by: Steven Silvester <https://github.com/blink1073/>


interface NPMObject {
  name: string;
  fileUrl: string;
}


interface System {
  import(module: string): Promise<any>;
  delete(module: string): boolean;
  npm: { [key: string]: NPMObject };
}


declare var System: System;

declare module 'System' {
  export = System;
}
