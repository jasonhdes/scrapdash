<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Vêm de `charges_details` na API do Mercado Pago (GET /v1/payments/{id}),
            // agrupadas pelas categorias que aparecem de verdade nos pagamentos desta
            // conta: taxa da venda (comissão do ML), taxa de processamento do MP,
            // custo de envio descontado do vendedor, taxa de financiamento (parcelamento
            // no cartão) e cupom/desconto aplicado. `net_received_amount` é o valor
            // líquido que efetivamente cai na conta do vendedor depois de tudo isso.
            $table->decimal('ml_fee', 10, 2)->nullable()->after('transaction_amount');
            $table->decimal('mp_processing_fee', 10, 2)->nullable()->after('ml_fee');
            $table->decimal('shipping_fee', 10, 2)->nullable()->after('mp_processing_fee');
            $table->decimal('financing_fee', 10, 2)->nullable()->after('shipping_fee');
            $table->decimal('coupon_amount', 10, 2)->nullable()->after('financing_fee');
            $table->decimal('net_received_amount', 10, 2)->nullable()->after('coupon_amount');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn([
                'ml_fee',
                'mp_processing_fee',
                'shipping_fee',
                'financing_fee',
                'coupon_amount',
                'net_received_amount',
            ]);
        });
    }
};
