import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  calculateEqualSplit,
  formatCurrency,
  formatDate,
  formatDateInput,
  roundMoney
} from "../../lib/ui";
import type {
  Expense,
  ExpensePayload,
  ExpenseShareInput,
  ExpenseSplitType,
  User,
  UserOption
} from "../../types";

interface ExpenseFormSheetProps {
  currentUser: User;
  initialExpense: Expense | null;
  onClose: () => void;
  onSave: (payload: ExpensePayload) => Promise<void>;
  onUploadImage: (file: File) => Promise<string>;
  users: UserOption[];
}

export function ExpenseFormSheet({
  currentUser,
  initialExpense,
  onClose,
  onSave,
  onUploadImage,
  users
}: ExpenseFormSheetProps) {
  const activeUsers = users.filter((item) => item.active);
  const initialSelectedIds = initialExpense
    ? initialExpense.shares.map((share) => share.userId)
    : activeUsers.slice(0, Math.min(activeUsers.length, 3)).map((item) => item.id);

  const [amount, setAmount] = useState<string>(initialExpense ? String(initialExpense.amount) : "");
  const [description, setDescription] = useState<string>(initialExpense?.description || "");
  const [imageUrl, setImageUrl] = useState<string>(initialExpense?.imageUrl || "");
  const [splitType, setSplitType] = useState<ExpenseSplitType>(initialExpense?.splitType || "EQUAL");
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [manualShares, setManualShares] = useState<Record<number, string>>(() => {
    const values: Record<number, string> = {};
    if (initialExpense) {
      initialExpense.shares.forEach((share) => {
        values[share.userId] = String(share.shareAmount);
      });
    }
    return values;
  });
  const [formError, setFormError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const expenseDate = initialExpense?.expenseDate || formatDateInput(new Date());
  const payerId = initialExpense?.payerId || currentUser.id || activeUsers[0]?.id || 0;
  const numericAmount = Number(amount || 0);
  const equalPreview = calculateEqualSplit(numericAmount, selectedIds.length);
  const manualTotal = selectedIds.reduce((sum, userId) => sum + Number(manualShares[userId] || 0), 0);

  function toggleUser(userId: number) {
    setSelectedIds((current) => {
      if (current.includes(userId)) {
        return current.filter((id) => id !== userId);
      }
      return [...current, userId];
    });
  }

  async function handleImagePick(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    setFormError("");
    setUploadingImage(true);

    try {
      const nextImageUrl = await onUploadImage(selectedFile);
      setImageUrl(nextImageUrl);
    } catch (uploadError) {
      setFormError(uploadError instanceof Error ? uploadError.message : "Không tải được ảnh hóa đơn.");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!numericAmount || numericAmount <= 0) {
      setFormError("Tổng tiền phải lớn hơn 0.");
      return;
    }

    if (!selectedIds.length) {
      setFormError("Hãy chọn ít nhất một người chịu tiền.");
      return;
    }

    let shares: ExpenseShareInput[] = [];
    if (splitType === "EQUAL") {
      shares = selectedIds.map((userId, index) => ({
        userId,
        shareAmount: equalPreview[index]
      }));
    } else {
      shares = selectedIds.map((userId) => ({
        userId,
        shareAmount: Number(manualShares[userId] || 0)
      }));

      const roundedAmount = roundMoney(numericAmount);
      const roundedShared = roundMoney(manualTotal);
      if (roundedAmount !== roundedShared) {
        setFormError("Tổng số tiền đã chia phải bằng tổng hóa đơn.");
        return;
      }
    }

    await onSave({
      payerId,
      amount: roundMoney(numericAmount),
      description,
      imageUrl,
      expenseDate,
      splitType,
      shares
    });
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet-card" onClick={(event) => event.stopPropagation()}>
        <button aria-label="Đóng form" className="icon-button sheet-close-button" onClick={onClose} type="button">
          ×
        </button>

        <div className="panel-heading sheet-header">
          <div>
            <p className="eyebrow">{initialExpense ? "Chỉnh sửa" : "Thêm mới"}</p>
            <h3>{initialExpense ? "Cập nhật khoản chi" : "Thêm khoản chi"}</h3>
          </div>
        </div>

        <form className="sheet-form" onSubmit={handleSubmit}>
          <label>
            Tổng tiền
            <input type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </label>

          <label>
            Mô tả
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>

          <div className="receipt-upload-card">
            <div className="receipt-upload-header">
              <div>
                <strong>Ảnh hóa đơn</strong>
                <p>{uploadingImage ? "Đang tải ảnh lên server..." : "Bạn có thể chọn ảnh từ thư viện hoặc mở camera để chụp mới."}</p>
              </div>
              <div className="receipt-upload-actions">
                <button className="secondary-button" onClick={() => libraryInputRef.current?.click()} type="button">
                  Thư viện
                </button>
                <button className="secondary-button" onClick={() => cameraInputRef.current?.click()} type="button">
                  Camera
                </button>
              </div>
            </div>
            <input
              ref={libraryInputRef}
              accept="image/*"
              hidden
              onChange={handleImagePick}
              type="file"
            />
            <input
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              hidden
              onChange={handleImagePick}
              type="file"
            />
            {imageUrl && (
              <div className="receipt-preview">
                <img alt="Ảnh hóa đơn" src={imageUrl} />
                <a href={imageUrl} rel="noreferrer" target="_blank">
                  Xem ảnh đầy đủ
                </a>
              </div>
            )}
          </div>

          <div className="readonly-grid">
            <div className="readonly-field">
              <span>Ngày chi</span>
              <strong>{formatDate(expenseDate)}</strong>
            </div>
            <div className="readonly-field">
              <span>Người thanh toán</span>
              <strong>{activeUsers.find((member) => member.id === payerId)?.fullName || currentUser.fullName}</strong>
            </div>
          </div>

          <div className="split-toggle">
            <button
              className={splitType === "EQUAL" ? "toggle-button active" : "toggle-button"}
              onClick={() => setSplitType("EQUAL")}
              type="button"
            >
              Chia đều
            </button>
            <button
              className={splitType === "AMOUNT" ? "toggle-button active" : "toggle-button"}
              onClick={() => setSplitType("AMOUNT")}
              type="button"
            >
              Chia theo số tiền
            </button>
          </div>

          <div className="member-selector">
            {activeUsers.map((member) => (
              <button
                key={member.id}
                className={selectedIds.includes(member.id) ? "member-chip active" : "member-chip"}
                onClick={() => toggleUser(member.id)}
                type="button"
              >
                {member.fullName}
              </button>
            ))}
          </div>

          {splitType === "AMOUNT" ? (
            <div className="share-grid">
              {selectedIds.map((userId) => {
                const member = activeUsers.find((item) => item.id === userId);
                if (!member) {
                  return null;
                }

                return (
                  <label key={userId}>
                    {member.fullName}
                    <input
                      type="number"
                      step="0.01"
                      value={manualShares[userId] || ""}
                      onChange={(event) =>
                        setManualShares((current) => ({
                          ...current,
                          [userId]: event.target.value
                        }))
                      }
                    />
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="preview-grid">
              {selectedIds.map((userId, index) => {
                const member = activeUsers.find((item) => item.id === userId);
                if (!member) {
                  return null;
                }

                return (
                  <div className="preview-row" key={userId}>
                    <span>{member.fullName}</span>
                    <strong>{formatCurrency(equalPreview[index] || 0)}</strong>
                  </div>
                );
              })}
            </div>
          )}

          <div className="summary-strip">
            <div>
              <span>Tổng hóa đơn</span>
              <strong>{formatCurrency(numericAmount)}</strong>
            </div>
            <div>
              <span>Tổng đã chia</span>
              <strong>{formatCurrency(splitType === "EQUAL" ? equalPreview.reduce((sum, item) => sum + item, 0) : manualTotal)}</strong>
            </div>
          </div>

          {formError && <p className="error-text">{formError}</p>}

          <div className="sheet-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              Đóng
            </button>
            <button className="primary-button" type="submit">
              {initialExpense ? "Lưu thay đổi" : "Lưu khoản chi"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
