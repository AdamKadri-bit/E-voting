<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Seeds the default administrator account.
     * Login: admin@evoting.local / Admin123!
     */
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@evoting.local'],
            [
                'name' => 'System Administrator',
                'password' => Hash::make('Admin123!'),
                'role' => 'admin',
                'verification_status' => 'account_created',
                'can_vote' => false,
            ]
        );

        // Keep the role authoritative even if the account already existed.
        if ($admin->role !== 'admin') {
            $admin->forceFill(['role' => 'admin'])->save();
        }

        // Admins log in like any user; email verification is required first.
        if (!$admin->hasVerifiedEmail()) {
            $admin->forceFill(['email_verified_at' => now()])->save();
        }
    }
}
