export function Header() {
  return (
    <header className="header">
      <div className="header-logo">
        <img src={`${import.meta.env.BASE_URL}compass.svg`} className="logo-icon" alt="MarineEye" />
        <span className="logo-text">MarineEye</span>
      </div>
    </header>
  );
}
