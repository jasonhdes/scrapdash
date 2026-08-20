<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // DB::statement em vez de ->change() pra não depender do
        // doctrine/dbal só por causa dessa mudança de tipo.
        DB::statement('ALTER TABLE order_returns MODIFY occurred_at DATETIME NOT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE order_returns MODIFY occurred_at DATE NOT NULL');
    }
};
