import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/lib/AdminAuthProvider';

export default function AdminLogin() {
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdminAuth();

  const handleLogin = async () => {
    if (!loginPassword.trim()) {
      toast({ title: "Password required", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        // Store the correct admin key for API authentication
        login('jugnu-admin-dev-2025');
        toast({ title: "Logged in successfully" });
        setLoginPassword('');
      } else {
        toast({ 
          title: "Login failed", 
          description: data.error, 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({ 
        title: "Login error", 
        description: "Failed to authenticate", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">Admin Access</CardTitle>
          <p className="text-gray-400">Enter your admin password to continue</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="password" className="text-white">Password</Label>
            <Input
              id="password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="mt-1 bg-gray-700 border-gray-600 text-white"
              placeholder="Enter admin password"
              disabled={isLoading}
              data-testid="input-admin-password"
            />
          </div>
          <Button 
            onClick={handleLogin}
            disabled={isLoading || !loginPassword.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700"
            data-testid="button-login"
          >
            {isLoading ? 'Authenticating...' : 'Login'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}