/**
 * Tabela de blocos de nucleo — disponivel para TODA surface sem registro (DOC-05
 * AC5). O registry a soma aos blocos exclusivos de cada surface em `blockTableFor`.
 */
import type { BlockTable } from "../RenderCtx";
import { Heading } from "./Heading";
import { Text } from "./Text";
import { Quote } from "./Quote";
import { Callout } from "./Callout";
import { Rule } from "./Rule";
import { Spacer } from "./Spacer";
import { Image } from "./Image";
import { Gallery } from "./Gallery";
import "./blocks.css";

export const coreBlocks: BlockTable = {
  heading: Heading,
  text: Text,
  quote: Quote,
  callout: Callout,
  rule: Rule,
  spacer: Spacer,
  image: Image,
  gallery: Gallery,
};
