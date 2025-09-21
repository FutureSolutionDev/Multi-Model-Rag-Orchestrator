import { LLMProvider, ProviderConfig } from "../Interface";
import {
  AnthropicProvider,
  AzureOpenAIProvider,
  CohereProvider,
  DeepSeekProvider,
  GoogleGenAIProvider,
  GroqProvider,
  MistralProvider,
  OllamaProvider,
  OpenAIProvider,
  XAIProvider,
} from "../Models";

export const Providers: LLMProvider[] = [
  new OpenAIProvider(),
  new AnthropicProvider(),
  new GoogleGenAIProvider(),
  new MistralProvider(),
  new CohereProvider(),
  new OllamaProvider(),
  new GroqProvider(),
  new DeepSeekProvider(),
  new XAIProvider(),
  new AzureOpenAIProvider(),
];
export const ProviderCfg: ProviderConfig[] = [
  { id: "groq", weight: 3, latencySLAms: 700 },
  { id: "openai", weight: 3, latencySLAms: 900 },
  { id: "anthropic", weight: 2, latencySLAms: 1100 },
  { id: "google", weight: 2, latencySLAms: 1200 },
  { id: "mistral", weight: 2, latencySLAms: 1000 },
  { id: "cohere", weight: 1, latencySLAms: 1400 },
  { id: "ollama", weight: 1, latencySLAms: 25, enabled: true },
  { id: "deepseek", weight: 1, latencySLAms: 1200 },
  { id: "xai", weight: 1, latencySLAms: 1300 },
  { id: "azure-openai", weight: 2, latencySLAms: 950 },
];
