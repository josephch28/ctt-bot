export interface ChannelAdapter {
  channel: string;
  send(externalId: string, text: string): Promise<void>;
  typing(externalId: string): Promise<void>;
}
