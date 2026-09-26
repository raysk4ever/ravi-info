import {
  SiAndroid,
  SiFfmpeg,
  SiJavascript,
  SiMongodb,
  SiMysql,
  SiNextdotjs,
  SiNodedotjs,
  SiOpenai,
  SiPython,
  SiReact,
  SiTypescript,
  SiVite,
} from "react-icons/si";
import { TbBrandReactNative, TbBrandSocketIo } from "react-icons/tb";
import { GiArtificialHive } from "react-icons/gi";
import { BsDiagram3 } from "react-icons/bs";
import { RiRobot2Line } from "react-icons/ri";
import { VscSymbolMisc } from "react-icons/vsc";
import type { IconType } from "react-icons";

/**
 * Tech name -> icon, so knowledge/projects.json can stay plain serialisable
 * data that both this component and the RAG indexer read.
 */
const TECH_ICONS: Record<string, IconType> = {
  "Agentic AI": RiRobot2Line,
  LangChain: GiArtificialHive,
  LangGraph: BsDiagram3,
  MCP: VscSymbolMisc,
  OpenAI: SiOpenai,
  "Next.js": SiNextdotjs,
  TypeScript: SiTypescript,
  Python: SiPython,
  "Node.js": SiNodedotjs,
  MongoDB: SiMongodb,
  MySQL: SiMysql,
  React: SiReact,
  Android: SiAndroid,
  FFmpeg: SiFfmpeg,
  Vite: SiVite,
  "Socket.io": TbBrandSocketIo,
  "React Native": TbBrandReactNative,
};

const FALLBACK = VscSymbolMisc;

export function techIcon(name: string): IconType {
  return TECH_ICONS[name] ?? FALLBACK;
}
