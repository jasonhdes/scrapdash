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
        Schema::table('accounts', function (Blueprint $table) {
            $table->decimal('financial_balance_seed', 12, 2)->nullable()->after('marketplace');
            $table->timestamp('financial_balance_seed_updated_at')->nullable()->after('financial_balance_seed');
            $table->timestamp('financial_last_validated_at')->nullable()->after('financial_balance_seed_updated_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn(['financial_balance_seed', 'financial_balance_seed_updated_at', 'financial_last_validated_at']);
        });
    }
};
