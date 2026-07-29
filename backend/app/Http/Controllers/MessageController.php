<?php

namespace App\Http\Controllers;

use App\Application\Services\AuditLogger;
use App\Http\Resources\MessageResource;
use App\Infrastructure\MercadoLivre\MercadoLivreService;
use App\Models\Account;
use App\Models\Message;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class MessageController extends Controller
{
    public function index(Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'messages']);

        $orders = Order::where('account_id', $account->id)
            ->whereHas('messages')
            ->with(['messages' => fn ($q) => $q->orderByDesc('sent_at')])
            ->get();

        $conversations = $orders
            ->sortByDesc(fn (Order $order) => $order->messages->first()?->sent_at)
            ->values()
            ->map(fn (Order $order) => [
                'order_id' => $order->id,
                'mercadolivre_order_id' => $order->mercadolivre_order_id,
                'buyer_nickname' => $order->buyer_nickname,
                'unread_count' => $order->messages->where('direction', 'received')->whereNull('read_at')->count(),
                'last_message' => $order->messages->first() ? new MessageResource($order->messages->first()) : null,
            ]);

        return response()->json([
            'data' => $conversations,
            'meta' => ['unread_total' => $conversations->sum('unread_count')],
        ]);
    }

    public function show(Account $account, Order $order): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'messages']);

        abort_if($order->account_id !== $account->id, 404);

        $messages = Message::whereIn('order_id', $this->conversationOrderIds($account, $order))
            ->orderBy('sent_at')
            ->get();

        return response()->json([
            'data' => [
                'order' => [
                    'id' => $order->id,
                    'mercadolivre_order_id' => $order->mercadolivre_order_id,
                    'buyer_nickname' => $order->buyer_nickname,
                ],
                'messages' => MessageResource::collection($messages),
            ],
        ]);
    }

    public function reply(Request $request, Account $account, Order $order, MercadoLivreService $mercadoLivre): JsonResponse
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'messages']);

        abort_if($order->account_id !== $account->id, 404);

        $validated = $request->validate(['text' => ['required', 'string', 'max:2000']]);

        $conversationOrderIds = $this->conversationOrderIds($account, $order);

        $lastMessage = Message::whereIn('order_id', $conversationOrderIds)
            ->whereNotNull('counterpart_id')
            ->orderByDesc('sent_at')
            ->first();

        abort_if(! $lastMessage, 422, 'Não é possível responder: nenhuma conversa encontrada para esse pedido.');

        $packId = $order->pack_id ?? $order->mercadolivre_order_id;

        $mercadoLivre->sendMessage($account, $packId, $lastMessage->counterpart_id, $validated['text']);

        $message = Message::create([
            'account_id' => $account->id,
            'order_id' => $order->id,
            // A API não retorna o id da mensagem recém-criada nessa chamada;
            // gera um id local só pra manter a coluna (unique) preenchida —
            // a próxima sincronização substitui pelo id real do Mercado Livre.
            'mercadolivre_message_id' => 'local-'.uniqid(),
            'direction' => 'sent',
            'counterpart_id' => $lastMessage->counterpart_id,
            'text' => $validated['text'],
            'status' => 'available',
            'sent_at' => now(),
            'synced_at' => now(),
        ]);

        AuditLogger::log($actor, 'message.replied', $account, $order, ['message_id' => $message->id]);

        return response()->json(['data' => new MessageResource($message)], 201);
    }

    /**
     * Pedidos que fazem parte da mesma compra (pack) compartilham conversa,
     * mas as mensagens só ficam salvas com o `order_id` de um pedido
     * "representante" do pack (é assim que o SyncMessagesJob grava). Pra
     * achar a conversa certa independente de qual pedido do pack foi aberto,
     * é preciso resolver todos os pedidos do mesmo pack primeiro.
     *
     * @return array<int, int>
     */
    private function conversationOrderIds(Account $account, Order $order): array
    {
        $packId = $order->pack_id ?? $order->mercadolivre_order_id;

        return Order::where('account_id', $account->id)
            ->where(fn ($q) => $q->where('pack_id', $packId)->orWhere('mercadolivre_order_id', $packId))
            ->pluck('id')
            ->all();
    }
}
