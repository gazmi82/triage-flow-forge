import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Role } from "@/data/mockData";
import { Activity } from "lucide-react";

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
  { value: "reception", label: "Reception" },
  { value: "triage_nurse", label: "Triage Nurse" },
  { value: "physician", label: "Physician" },
  { value: "lab", label: "Laboratory" },
  { value: "radiology", label: "Radiology" },
  { value: "admin", label: "Administrator" },
];

const SIGN_IN_DEMO_USERS: Array<{ name: string; role: string; email: string; password: string }> = [
  { name: "Maria Santos", role: "Reception", email: "m.santos@hospital.org", password: "demo123" },
  { name: "James Okafor", role: "Triage Nurse", email: "j.okafor@hospital.org", password: "demo123" },
  { name: "Olivia Ross", role: "Reception", email: "o.ross@hospital.org", password: "demo123" },
  { name: "Dr. Emily Chen", role: "Physician", email: "e.chen@hospital.org", password: "demo123" },
  { name: "Carlos Rivera", role: "Laboratory", email: "c.rivera@hospital.org", password: "demo123" },
  { name: "Priya Nair", role: "Radiology", email: "p.nair@hospital.org", password: "demo123" },
];

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading, login, register } = useAuth();
  const [activeTab, setActiveTab] = useState("sign-in");

  const [loginEmail, setLoginEmail] = useState("e.chen@hospital.org");
  const [loginPassword, setLoginPassword] = useState("demo123");
  const [loginError, setLoginError] = useState("");

  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "triage_nurse" as Role,
    department: "Emergency",
  });
  const [registerError, setRegisterError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const result = await login(loginEmail, loginPassword);
    if (!result.ok) {
      setLoginError(result.error ?? "Unable to sign in.");
      return;
    }
    toast({ title: "Signed in", description: "Welcome back to HospitalBPM." });
    navigate("/");
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    if (registerForm.password.length < 6) {
      setRegisterError("Password must be at least 6 characters.");
      return;
    }
    const result = await register(registerForm);
    if (!result.ok) {
      setRegisterError(result.error ?? "Unable to create account.");
      return;
    }
    toast({ title: "Account created", description: "Mock account created and signed in." });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 p-4 md:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl items-center justify-center md:min-h-[calc(100vh-3rem)]">
        <div className="grid w-full gap-6 md:grid-cols-2">
          <Card className="border-border/70 bg-card/90 backdrop-blur">
            <CardHeader>
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-md bg-primary/10 p-1.5 text-primary">
                  <Activity className="h-4 w-4" />
                </div>
                <Badge variant="outline">Mock Authentication</Badge>
              </div>
              <CardTitle className="text-xl">HospitalBPM Access</CardTitle>
              <CardDescription>Sign in or create a mock account to continue.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="sign-in">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Create Account</TabsTrigger>
                </TabsList>

                <TabsContent value="sign-in" className="mt-4">
                  <form onSubmit={submitLogin} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="e.chen@hospital.org"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="demo123"
                      />
                    </div>
                    {loginError && <p className="text-xs text-destructive">{loginError}</p>}
                    <Button type="submit" className="w-full" disabled={isLoading}>Sign In</Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="mt-4">
                  <form onSubmit={submitRegister} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Full Name</Label>
                      <Input
                        required
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Alex Carter"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        required
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="alex.carter@hospital.org"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Role</Label>
                        <Select
                          value={registerForm.role}
                          onValueChange={(value: Role) => setRegisterForm((prev) => ({ ...prev, role: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Department</Label>
                        <Input
                          required
                          value={registerForm.department}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, department: e.target.value }))}
                          placeholder="Emergency"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Password</Label>
                      <Input
                        type="password"
                        required
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="At least 6 characters"
                      />
                    </div>
                    {registerError && <p className="text-xs text-destructive">{registerError}</p>}
                    <Button type="submit" className="w-full" disabled={isLoading}>Create Account</Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="hidden border-border/70 bg-card/80 md:block">
            <CardHeader>
              <CardTitle>Mock Credentials</CardTitle>
              <CardDescription>Use any role-based account for quick access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {SIGN_IN_DEMO_USERS.map((demo) => (
                <div key={demo.email} className="rounded-md border border-border bg-muted/40 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-medium">{demo.role}</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => {
                        setActiveTab("sign-in");
                        setLoginEmail(demo.email);
                        setLoginPassword(demo.password);
                      }}
                    >
                      Use
                    </Button>
                  </div>
                  <p className="text-xs text-foreground">{demo.name}</p>
                  <p className="text-muted-foreground">Email: {demo.email}</p>
                  <p className="text-muted-foreground">Password: {demo.password}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
