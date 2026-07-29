export interface Message {
  id: number;
  mercadolivre_message_id: string;
  direction: "sent" | "received";
  text: string | null;
  status: string | null;
  sent_at: string | null;
  read_at: string | null;
}

export interface Conversation {
  order_id: number;
  mercadolivre_order_id: string;
  buyer_nickname: string | null;
  unread_count: number;
  last_message: Message | null;
}

export interface ConversationThread {
  order: {
    id: number;
    mercadolivre_order_id: string;
    buyer_nickname: string | null;
  };
  messages: Message[];
}
