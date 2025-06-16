import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@zynlo/supabase/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { userId, success, loginMethod = 'email_password', sessionId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get IP address from various possible headers
    const headersList = headers();
    const forwarded = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const cfConnectingIp = headersList.get('cf-connecting-ip');
    const vercelForwardedFor = headersList.get('x-vercel-forwarded-for');
    const remoteAddr = request.ip;

    // Try to get the real IP address in order of preference
    let ipAddress =
      forwarded?.split(',')[0]?.trim() ||
      realIp ||
      cfConnectingIp ||
      vercelForwardedFor ||
      remoteAddr ||
      '127.0.0.1';

    // In development, if we get localhost, keep it clear
    if (ipAddress === '::1' || ipAddress === '127.0.0.1') {
      ipAddress = ipAddress === '::1' ? '::1' : '127.0.0.1';
    }

    // Get User-Agent
    const userAgent = headersList.get('user-agent') || '';

    // Parse User-Agent for device info (basic parsing)
    const parseUserAgent = (ua: string) => {
      const deviceType = /Mobile|Android|iPhone|iPad/.test(ua)
        ? 'mobile'
        : /Tablet|iPad/.test(ua)
          ? 'tablet'
          : 'desktop';

      const browser = ua.includes('Chrome')
        ? 'Chrome'
        : ua.includes('Firefox')
          ? 'Firefox'
          : ua.includes('Safari')
            ? 'Safari'
            : ua.includes('Edge')
              ? 'Edge'
              : 'Unknown';

      const os = ua.includes('Windows')
        ? 'Windows'
        : ua.includes('Mac')
          ? 'macOS'
          : ua.includes('Linux')
            ? 'Linux'
            : ua.includes('Android')
              ? 'Android'
              : ua.includes('iOS')
                ? 'iOS'
                : 'Unknown';

      return { deviceType, browser, os };
    };

    const { deviceType, browser, os } = parseUserAgent(userAgent);

    // Calculate session expiry (1 hour from now)
    const expiresAt = sessionId ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : null;

    // Create server client
    const supabase = createServerClient(process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Log the login attempt
    const { data, error } = await supabase.rpc('log_login_attempt', {
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_login_method: loginMethod,
      p_success: success,
      p_session_id: sessionId,
      p_expires_at: expiresAt,
    });

    if (error) {
      console.error('Error logging login session:', error);
      return NextResponse.json({ error: 'Failed to log session' }, { status: 500 });
    }

    // Optionally fetch geolocation data (requires external service)
    // This could be enhanced with services like ipapi.co or similar

    return NextResponse.json({
      success: true,
      sessionLogId: data,
      deviceInfo: { deviceType, browser, os, ipAddress },
    });
  } catch (error) {
    console.error('Login logging error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
