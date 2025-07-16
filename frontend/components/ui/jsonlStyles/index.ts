export * from "./notebook";
export * from "./defaultStyle";
export * from "./headspace";
export * from "./neumorphism";

import { notebookStyleRenderer } from "./notebook";
import { defaultStyleRenderer } from "./defaultStyle";
import { headspaceStyleRenderer } from "./headspace";
import { neumorphismStyleRenderer } from "./neumorphism";
import { StyleRenderer } from "./types";

export const jsonlStyles: Record<string, StyleRenderer> = {
  notebook: notebookStyleRenderer,
  default: defaultStyleRenderer,
  headspace: headspaceStyleRenderer,
  neumorphism: neumorphismStyleRenderer,
};
