'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { Card } from '@/components/ui/card';

export function AuthDebug() {
  const [authState, setAuthState] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const supabase = useSupabase();

  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 AuthDebug: Starting auth check');
      
      // Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔍 AuthDebug: Session check:', { session: session?.user?.email, error: sessionError });
      
      // Check user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('🔍 AuthDebug: User check:', { user: user?.email, error: userError });
      
      setAuthState({
        hasSession: !!session,
        hasUser: !!user,
        userEmail: user?.email || session?.user?.email,
        sessionError,
        userError
      });

      if (user) {
        // Check profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        console.log('🔍 AuthDebug: Profile check:', { profile: profileData, error: profileError });
        setProfile({ data: profileData, error: profileError });

        if (profileData?.org_id) {
          // Check membership
          const { data: membershipData, error: membershipError } = await supabase
            .from('memberships')
            .select('*')
            .eq('user_id', user.id)
            .eq('org_id', profileData.org_id)
            .single();
          
          console.log('🔍 AuthDebug: Membership check:', { membership: membershipData, error: membershipError });
          setMembership({ data: membershipData, error: membershipError });
        }
      }
    };

    checkAuth();
  }, [supabase]);

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className="fixed top-4 right-4 z-50 p-4 max-w-md bg-background/95 backdrop-blur">
      <h3 className="font-bold text-sm mb-2">🔍 Auth Debug</h3>
      <div className="space-y-2 text-xs">
        <div>
          <strong>Auth State:</strong>
          <pre className="text-xs bg-muted p-1 rounded mt-1">
            {JSON.stringify(authState, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>Profile:</strong>
          <pre className="text-xs bg-muted p-1 rounded mt-1">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>Membership:</strong>
          <pre className="text-xs bg-muted p-1 rounded mt-1">
            {JSON.stringify(membership, null, 2)}
          </pre>
        </div>
      </div>
    </Card>
  );
}