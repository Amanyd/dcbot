import { Events, ActivityType, Client } from 'discord.js';
import type { ClientEvent } from '../types/index.js';

export const ready: ClientEvent = {
  name: Events.ClientReady,
  once: true,
  execute(client: unknown) {
    const readyClient = client as Client<true>;

    readyClient.user.setActivity({
      name: 'music',
      type: ActivityType.Playing,
    });
  },
};
