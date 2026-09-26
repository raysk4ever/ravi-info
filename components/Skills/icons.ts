import type { IconType } from "react-icons";
import { FaAws, FaDocker, FaNodeJs, FaReact } from "react-icons/fa";
import {
  SiFirebase,
  SiTypescript,
  SiMongodb,
  SiFfmpeg,
  SiAndroid,
  SiHtml5,
  SiCss3,
  SiKubernetes,
  SiNginx,
  SiNextdotjs,
  SiJavascript,
  SiMysql,
  SiOpenai,
  SiGooglegemini,
  SiOllama,
  SiPython,
  SiRedis,
  SiGraphql,
  SiGit,
} from "react-icons/si";
import { TbBrandThreejs, TbBrandSocketIo } from "react-icons/tb";
import { VscSymbolMisc } from "react-icons/vsc";
import { GiArtificialHive } from "react-icons/gi";
import { BsDiagram3 } from "react-icons/bs";
import { RiRobot2Line } from "react-icons/ri";

/**
 * Icon key -> component, so knowledge/skills.json stays plain serialisable data
 * shared with the RAG indexer. Keys match the `icon` field in that file.
 */
const ICONS: Record<string, IconType> = {
  openai: SiOpenai,
  gemini: SiGooglegemini,
  ollama: SiOllama,
  langchain: GiArtificialHive,
  langgraph: BsDiagram3,
  mcp: VscSymbolMisc,
  agentic: RiRobot2Line,
  python: SiPython,
  vector: VscSymbolMisc,
  mongodb: SiMongodb,
  redis: SiRedis,
  mysql: SiMysql,
  graphql: SiGraphql,
  react: FaReact,
  nextjs: SiNextdotjs,
  typescript: SiTypescript,
  javascript: SiJavascript,
  node: FaNodeJs,
  socketio: TbBrandSocketIo,
  threejs: TbBrandThreejs,
  docker: FaDocker,
  kubernetes: SiKubernetes,
  aws: FaAws,
  nginx: SiNginx,
  firebase: SiFirebase,
  git: SiGit,
  android: SiAndroid,
  html5: SiHtml5,
  css3: SiCss3,
  ffmpeg: SiFfmpeg,
};

const FALLBACK = VscSymbolMisc;

export function skillIcon(key: string): IconType {
  return ICONS[key] ?? FALLBACK;
}
