import { NextRequest, NextResponse } from 'next/server';
import { serverSupabase } from '@/utils/supabase/server';

/**
 * Auto-login endpoint for testing and automation
 * Usage: GET /api/auth/auto-login?email=test@receipt-ai.local&password=TestPassword123!
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    const password = searchParams.get('password');
    const redirectTo = searchParams.get('redirect') || '/';

    if (!email || !password) {
        return NextResponse.json(
            { error: 'Email and password are required' },
            { status: 400 }
        );
    }

    try {
        const supabase = await serverSupabase();

        // Sign in with email and password
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return NextResponse.json(
                { error: error.message },
                { status: 401 }
            );
        }

        if (!data.session) {
            return NextResponse.json(
                { error: 'No session created' },
                { status: 401 }
            );
        }

        // Create response with redirect
        const response = NextResponse.redirect(new URL(redirectTo, request.url));

        // Set session cookies
        response.cookies.set('sb-access-token', data.session.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: data.session.expires_in,
            path: '/',
        });

        response.cookies.set('sb-refresh-token', data.session.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Auto-login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
