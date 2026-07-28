<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('shipping_id')->nullable()->after('pack_id');
            $table->string('buyer_city')->nullable()->after('buyer_nickname');
            $table->string('buyer_state')->nullable()->after('buyer_city');
            $table->timestamp('buyer_address_synced_at')->nullable()->after('buyer_state');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['shipping_id', 'buyer_city', 'buyer_state', 'buyer_address_synced_at']);
        });
    }
};
