"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SellerShell } from "@/components/layout/SellerShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSellerUser, getSellerToken } from "@/lib/session";
import { logoutSeller } from "@/services/auth-api";
import { useTheme } from "@/components/providers/ThemeProvider";
import { apiPost, apiUrl } from "@/lib/api-client";

const TEAM_ROLES = ["vendor_manager", "vendor_sales", "vendor_content"];

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme, lang, setLang } = useTheme();
  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("vendor_sales");
  const [inviteName, setInviteName] = useState("");
  const [teamMsg, setTeamMsg] = useState("");
  const [teamError, setTeamError] = useState("");
  const [teamBusy, setTeamBusy] = useState(false);

  useEffect(() => {
    setUser(getSellerUser());
  }, []);

  const loadTeam = useCallback(async () => {
    try {
      const { json } = await apiPost("/api/vendors", { action: "list_team" });
      if (json.success) setMembers(Array.isArray(json.data?.members) ? json.data.members : []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  async function onLogout() {
    await logoutSeller();
    router.replace("/login");
  }

  async function onChangePassword(e) {
    e.preventDefault();
    setPwBusy(true);
    setPwError("");
    setPwMsg("");
    try {
      const token = getSellerToken();
      const res = await fetch(apiUrl("/api/auth"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          action: "change_password",
          currentPassword,
          newPassword,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Password change failed");
      setPwMsg("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwError(err.message || "Password change failed");
    } finally {
      setPwBusy(false);
    }
  }

  async function inviteMember(e) {
    e.preventDefault();
    setTeamBusy(true);
    setTeamError("");
    setTeamMsg("");
    try {
      const { json } = await apiPost("/api/vendors", {
        action: "invite_team",
        email: inviteEmail,
        role: inviteRole,
        name: inviteName,
      });
      if (!json.success) throw new Error(json.message || "Invite failed");
      const tip = json.data?.demoTempPassword
        ? ` Temp password (email stub): ${json.data.demoTempPassword}`
        : "";
      setTeamMsg(`Invited ${inviteEmail}.${tip}`);
      setInviteEmail("");
      setInviteName("");
      await loadTeam();
    } catch (err) {
      setTeamError(err.message || "Invite failed");
    } finally {
      setTeamBusy(false);
    }
  }

  async function removeMember(id) {
    if (!window.confirm("Remove this team member?")) return;
    setTeamBusy(true);
    setTeamError("");
    try {
      const { json } = await apiPost("/api/vendors", { action: "remove_team", userId: id });
      if (!json.success) throw new Error(json.message || "Remove failed");
      setTeamMsg("Member removed.");
      await loadTeam();
    } catch (err) {
      setTeamError(err.message || "Remove failed");
    } finally {
      setTeamBusy(false);
    }
  }

  async function changeRole(id, role) {
    setTeamBusy(true);
    setTeamError("");
    try {
      const { json } = await apiPost("/api/vendors", {
        action: "update_team_role",
        userId: id,
        role,
      });
      if (!json.success) throw new Error(json.message || "Role update failed");
      await loadTeam();
    } catch (err) {
      setTeamError(err.message || "Role update failed");
    } finally {
      setTeamBusy(false);
    }
  }

  return (
    <SellerShell title="Account Settings">
      <PageHeader title="Account Settings" subtitle="Security, appearance, and seller team seats." />

      <section className="mb-6 max-w-xl space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="m-0 text-sm font-semibold">Account</h2>
        <p className="text-sm text-muted">Name: {user?.name || "—"}</p>
        <p className="text-sm text-muted">Email: {user?.email || "—"}</p>
        <p className="text-sm text-muted">Vendor ID: {user?.vendorId || "—"}</p>
        <p className="text-sm text-muted">Roles: {(user?.roles || []).join(", ") || "—"}</p>
      </section>

      <section className="mb-6 max-w-xl space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="m-0 text-sm font-semibold">Change password</h2>
        {pwError ? <p className="text-sm text-danger">{pwError}</p> : null}
        {pwMsg ? <p className="text-sm text-gold">{pwMsg}</p> : null}
        <form onSubmit={onChangePassword} className="space-y-3">
          <label className="block text-sm text-muted">
            Current password
            <input
              type="password"
              className="input-field mt-1"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <label className="block text-sm text-muted">
            New password (min 8)
            <input
              type="password"
              className="input-field mt-1"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" className="btn-primary" disabled={pwBusy}>
            {pwBusy ? "Saving…" : "Update password"}
          </button>
        </form>
        <p className="m-0 text-xs text-muted">
          Forgot password? Use{" "}
          <a href="/forgot-password" className="text-gold underline">
            /forgot-password
          </a>{" "}
          on the login screen.
        </p>
      </section>

      <section className="mb-6 max-w-2xl space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="m-0 text-sm font-semibold">Team members</h2>
        <p className="m-0 text-xs text-muted">
          Invite colleagues with seller roles (Premium team seats). They receive an email with a temporary password.
        </p>
        {teamError ? <p className="text-sm text-danger">{teamError}</p> : null}
        {teamMsg ? <p className="text-sm text-gold">{teamMsg}</p> : null}
        <form onSubmit={inviteMember} className="flex flex-wrap gap-2">
          <input
            className="input-field min-w-[10rem] flex-1"
            placeholder="Name"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
          />
          <input
            className="input-field min-w-[12rem] flex-1"
            type="email"
            placeholder="Email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
          />
          <select
            className="input-field"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          >
            {TEAM_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary" disabled={teamBusy}>
            Invite
          </button>
        </form>
        <div className="overflow-x-auto">
          <table className="data-table w-full text-sm">
            <thead>
              <tr>
                <th>Member</th>
                <th>Roles</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const id = String(m._id);
                const isOwner = (m.roles || []).includes("vendor_owner");
                return (
                  <tr key={id}>
                    <td>
                      <strong>{m.name || "—"}</strong>
                      <div className="text-xs text-muted">{m.email}</div>
                    </td>
                    <td>
                      {isOwner ? (
                        <span className="text-xs">vendor_owner</span>
                      ) : (
                        <select
                          className="input-field"
                          value={(m.roles || []).find((r) => TEAM_ROLES.includes(r)) || "vendor_sales"}
                          disabled={teamBusy}
                          onChange={(e) => changeRole(id, e.target.value)}
                        >
                          {TEAM_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {!isOwner ? (
                        <button
                          type="button"
                          className="btn-outline text-xs text-danger"
                          disabled={teamBusy}
                          onClick={() => removeMember(id)}
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-xs text-muted">Owner</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6 max-w-xl space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="m-0 text-sm font-semibold">Appearance</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={theme === "dark" ? "btn-primary" : "btn-outline"}
            onClick={() => setTheme("dark")}
          >
            Dark
          </button>
          <button
            type="button"
            className={theme === "light" ? "btn-primary" : "btn-outline"}
            onClick={() => setTheme("light")}
          >
            Light
          </button>
        </div>
      </section>

      <section className="mb-6 max-w-xl space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="m-0 text-sm font-semibold">Language</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={lang === "en" ? "btn-primary" : "btn-outline"}
            onClick={() => setLang("en")}
          >
            English
          </button>
          <button
            type="button"
            className={lang === "ar" ? "btn-primary" : "btn-outline"}
            onClick={() => setLang("ar")}
          >
            العربية
          </button>
        </div>
      </section>

      <section className="max-w-xl space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="m-0 text-sm font-semibold">Session</h2>
        <button type="button" className="btn-danger" onClick={onLogout}>
          Log out
        </button>
      </section>
    </SellerShell>
  );
}
