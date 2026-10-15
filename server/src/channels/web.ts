// Web chat widget: messages go out over the /widget Socket.IO namespace.
import type { Bot, Contact } from '@prisma/client';
import type { OutMessage } from '../engine/flow-runner.js';
import { emitToVisitor } from '../realtime.js';

export async function sendWeb(bot: Bot, contact: Contact, messages: OutMessage[]) {
  for (const m of messages) {
    emitToVisitor(bot.id, contact.senderId, 'message', {
      sender: 'bot',
      content: m.text,
      imageUrl: m.imageUrl,
      buttons: m.buttons?.map((b) => ({ label: b.label, payload: b.payload })),
      createdAt: new Date().toISOString(),
    });
  }
}
