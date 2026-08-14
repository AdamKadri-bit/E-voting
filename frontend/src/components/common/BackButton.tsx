import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type BackButtonProps = {
  /** Where to go when there is no browser history to go back to. */
  fallback?: string;
  label?: string;
};

/**
 * A small "Back" button used across pages.
 * - Goes to the previous page when there is navigation history.
 * - Falls back to `fallback` (default /dashboard) on a direct/first load,
 *   where React Router reports location.key === "default".
 */
export default function BackButton({
  fallback = "/dashboard",
  label = "Back",
}: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleBack() {
    if (location.key === "default") {
      navigate(fallback);
    } else {
      navigate(-1);
    }
  }

  return (
    <button
      type="button"
      className="govBtn"
      onClick={handleBack}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}
