
export default function Footer() {
    return (
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">C</span>
            <span>CampusPulse</span>
          </div>
  
          <p>
            Making campus life better, one issue at a time.
          </p>
  
          <p className="footer-copyright">
            © {new Date().getFullYear()} CampusPulse. All rights reserved.
          </p>
        </div>
      </footer>
    );
  }
  