import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@zynlo/supabase/server';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId } = await request.json();

    if (!userId || !sessionId) {
      return NextResponse.json({ error: 'User ID and session ID are required' }, { status: 400 });
    }

    // Check if this session is already logged
    const supabase = createServerClient(process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: existingSession } = await supabase
      .from('login_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .single();

    if (existingSession) {
      return NextResponse.json({
        success: true,
        message: 'Session already logged',
        sessionLogId: existingSession.id,
      });
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

    // In development, if we get localhost, try to get external IP info
    if (ipAddress === '::1' || ipAddress === '127.0.0.1') {
      // Keep localhost as-is - we'll format it nicely in the frontend
      ipAddress = ipAddress === '::1' ? '::1' : '127.0.0.1';
    }
    const userAgent = headersList.get('user-agent') || '';

    // Parse User-Agent for device info
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
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Log the current session
    const { data, error } = await supabase.rpc('log_login_attempt', {
      p_user_id: userId,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_login_method: 'current_session',
      p_success: true,
      p_session_id: sessionId,
      p_expires_at: expiresAt,
    });

    if (error) {
      console.error('Error logging current session:', error);
      return NextResponse.json({ error: 'Failed to log session' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sessionLogId: data,
      deviceInfo: { deviceType, browser, os, ipAddress },
    });
  } catch (error) {
    console.error('Current session logging error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
