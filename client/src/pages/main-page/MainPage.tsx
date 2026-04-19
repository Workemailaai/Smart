import styles from "./MainPage.module.css";
import { observer } from "mobx-react-lite";
import { userStore } from "@/entities/user";
import { useNavigate } from "react-router";
import { useCallback, useEffect, useState } from "react";

type RoleChoice = "organizer" | "jury";

const MOBILE_MQ = "(max-width: 430px)";

export const MainPage = observer(() => {
  const navigate = useNavigate();

  const user = userStore.user;

  const [isCompactMobile, setIsCompactMobile] = useState(false);

  const [selectedRole, setSelectedRole] = useState<RoleChoice | null>(null);

  useEffect(() => {
    if (user) {
      navigate("/cabinet");
    }
  }, [navigate, user]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);

    const sync = () => setIsCompactMobile(mq.matches);

    sync();

    mq.addEventListener("change", sync);

    return () => mq.removeEventListener("change", sync);
  }, []);

  const goOrganizer = useCallback(
    () => navigate("/auth/organizer/sign-in"),
    [navigate],
  );

  const goJury = useCallback(() => navigate("/auth/jury/sign-in"), [navigate]);

  const onOrganizerClick = () => {
    if (isCompactMobile) {
      setSelectedRole("organizer");

      return;
    }

    goOrganizer();
  };

  const onJuryClick = () => {
    if (isCompactMobile) {
      setSelectedRole("jury");

      return;
    }

    goJury();
  };

  const onContinue = () => {
    if (selectedRole === "organizer") {
      goOrganizer();
    } else if (selectedRole === "jury") {
      goJury();
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.overlay} />

      <div className={styles.content}>
        <h1 className={styles.logo}>СмартОценка</h1>

        <p className={styles.mobileTitle}>Выберите роль</p>

        <div className={styles.cards}>
          <button
            className={`${styles.card} ${styles.cardOrganizer} ${isCompactMobile && selectedRole === "organizer" ? styles.cardSelected : ""}`}
            onClick={onOrganizerClick}
            type="button"
          >
            <img
              className={styles.avatar}
              src="/auth/organizer-icon.png"
              alt="Иконка организатора"
            />

            <p className={styles.cardTitle}>Я организатор</p>
          </button>

          <button
            className={`${styles.card} ${styles.cardJury} ${isCompactMobile && selectedRole === "jury" ? styles.cardSelected : ""}`}
            onClick={onJuryClick}
            type="button"
          >
            <img
              className={styles.avatar}
              src="/auth/jury-icon.png"
              alt="Иконка жюри"
            />

            <p className={styles.cardTitle}>Я жюри</p>
          </button>
        </div>

        <button
          className={styles.continueBtn}
          disabled={!isCompactMobile || !selectedRole}
          onClick={onContinue}
          type="button"
        >
          Продолжить
        </button>

        <p className={styles.footerText}>
          v 1.0.
          <br />© 2026 СмартОценка
        </p>
      </div>
    </section>
  );
});
