import { fallbackAvatar } from "../../lib/ui";
import type { User, UserOption, UserRole } from "../../types";

interface AccountTabProps {
  currentUser: User;
  onLogout: () => void;
  onUserRoleChange: (userId: number, role: UserRole) => void;
  onUserStatusChange: (userId: number, active: boolean) => void;
  users: UserOption[];
}

export function AccountTab({
  currentUser,
  onLogout,
  onUserRoleChange,
  onUserStatusChange,
  users
}: AccountTabProps) {
  return (
    <div className="tab-stack">
      <section className="panel-card account-panel">
        <div className="account-header">
          <img alt={currentUser.fullName} src={currentUser.avatarUrl || fallbackAvatar(currentUser.fullName)} />
          <div className="account-meta">
            <h3>{currentUser.fullName}</h3>
            <p>{currentUser.email}</p>
          </div>
        </div>
        <div className="account-stats">
          <div className="account-stat">
            <span>Vai trò</span>
            <strong>{currentUser.role}</strong>
          </div>
          <div className="account-stat">
            <span>Trạng thái</span>
            <strong>{currentUser.active ? "Đang hoạt động" : "Đã bị khóa"}</strong>
          </div>
        </div>
        <button className="secondary-button danger full-width" onClick={onLogout} type="button">
          Đăng xuất
        </button>
      </section>

      {currentUser.role === "ADMIN" && (
        <section className="panel-card">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Quản lý thành viên</p>
              <h3>Admin panel</h3>
              <p className="muted-text">
                Danh sách này bao gồm cả tài khoản đang hoạt động và tài khoản đã bị khóa.
              </p>
            </div>
          </div>
          <div className="list-stack">
            {users.map((member) => (
              <article className="member-admin-card" key={member.id}>
                <div className="member-admin-info">
                  <strong>{member.fullName}</strong>
                  <p>{member.email}</p>
                  <span className={member.active ? "member-status active" : "member-status inactive"}>
                    {member.active ? "Đang hoạt động" : "Đã bị khóa"}
                  </span>
                </div>
                <div className="member-actions">
                  <select
                    value={member.role}
                    onChange={(event) => onUserRoleChange(member.id, event.target.value as UserRole)}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="MEMBER">MEMBER</option>
                  </select>
                  <button
                    className={member.active ? "secondary-button" : "secondary-button danger"}
                    onClick={() => onUserStatusChange(member.id, !member.active)}
                    type="button"
                  >
                    {member.active ? "Khóa" : "Mở khóa"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
