import { observer } from 'mobx-react-lite'
import { useNavigate } from 'react-router'
import { userStore } from '@/entities/user'
import type { AuthPanelMode, ViewConfig } from '../../model/authPanel.types'
import { authFormStore } from '../../model/authFormStore'
import styles from './AuthPanel.module.css'

type AuthPanelProps = {
  mode: AuthPanelMode
}

const views: Record<AuthPanelMode, ViewConfig> = {
  signUpOrg: {
    title: 'Регистрация',
    subtitle: 'Профиль организатора',
    fields: ['Имя / Организация', '+7 999 999-99-99', 'Пароль', 'Повторите пароль'],
    submitText: 'Зарегистрироваться',
    secondaryAction: 'Быстрый вход через VK',
    bottomText: 'Уже зарегистрированы?',
    bottomLink: 'Войти',
    bottomTarget: 'signInOrg'
  },
  signInOrg: {
    title: 'Вход в систему',
    subtitle: 'Профиль организатора',
    fields: ['Телефон', 'Пароль'],
    submitText: 'Войти как организатор',
    secondaryAction: 'Быстрый вход через VK',
    bottomText: 'Нет аккаунта?',
    bottomLink: 'Зарегистрироваться',
    bottomTarget: 'signUpOrg'
  },
  signInJury: {
    title: 'Вход в систему',
    subtitle: 'Профиль жюри',
    fields: ['Телефон', 'Пароль'],
    submitText: 'Войти как жюри'
  }
}

const authModePath: Record<AuthPanelMode, string> = {
  signUpOrg: '/auth/organizer/sign-up',
  signInOrg: '/auth/organizer/sign-in',
  signInJury: '/auth/jury/sign-in'
}

export const AuthPanel = observer(({ mode }: AuthPanelProps) => {
  const navigate = useNavigate()
  const { signUpForm, signInOrgForm, signInJuryForm } = authFormStore

  const currentView = views[mode]
  const isOrganizerMode = mode !== 'signInJury'
  const canSwitchMode = Boolean(currentView.bottomTarget && currentView.bottomText && currentView.bottomLink)
  const bottomTarget = currentView.bottomTarget

  const changeView = (targetMode: AuthPanelMode) => {
    navigate(authModePath[targetMode])
    authFormStore.resetStatus()
  }

  const handleSubmit = async () => {
    if (mode === 'signUpOrg') {
      if (!signUpForm.fullName || !signUpForm.phone || !signUpForm.password || !signUpForm.repeatPassword) {
        authFormStore.setError('Заполните все поля регистрации')
        return
      }

      if (signUpForm.password !== signUpForm.repeatPassword) {
        authFormStore.setError('Пароли не совпадают')
        return
      }

      await authFormStore.signUpOrganizer({
        fullName: signUpForm.fullName,
        phone: signUpForm.phone,
        password: signUpForm.password,
      })
      if (userStore.user) {
        navigate('/cabinet/events')
      }
      return
    }

    if (mode === 'signInOrg') {
      if (!signInOrgForm.phone || !signInOrgForm.password) {
        authFormStore.setError('Заполните телефон и пароль')
        return
      }

      await authFormStore.signInOrganizer({
        phone: signInOrgForm.phone,
        password: signInOrgForm.password,
      })
      if (userStore.user) {
        navigate('/cabinet/events')
      }
      return
    }

    if (!signInJuryForm.phone || !signInJuryForm.password) {
      authFormStore.setError('Заполните телефон и пароль')
      return
    }

    await authFormStore.signInJury({
      phone: signInJuryForm.phone,
      password: signInJuryForm.password,
    })
    if (userStore.user) {
      navigate('/cabinet/events')
    }
  }

  const renderInput = (field: string) => {
    if (mode === 'signUpOrg') {
      const mapper: Record<string, keyof typeof signUpForm> = {
        'Имя / Организация': 'fullName',
        '+7 999 999-99-99': 'phone',
        Пароль: 'password',
        'Повторите пароль': 'repeatPassword',
      }
      const key = mapper[field]
      const type = field.toLowerCase().includes('пароль') ? 'password' : 'text'
      return (
        <input
          className={styles.input}
          key={field}
          onChange={(event) => authFormStore.setSignUpField(key, event.target.value)}
          placeholder={field}
          type={type}
          value={signUpForm[key]}
        />
      )
    }

    if (mode === 'signInOrg') {
      const mapper: Record<string, keyof typeof signInOrgForm> = {
        Телефон: 'phone',
        Пароль: 'password',
      }
      const key = mapper[field]
      const type = field.toLowerCase().includes('пароль') ? 'password' : 'text'
      return (
        <input
          className={styles.input}
          key={field}
          onChange={(event) => authFormStore.setSignInOrgField(key, event.target.value)}
          placeholder={field}
          type={type}
          value={signInOrgForm[key]}
        />
      )
    }

    const mapper: Record<string, keyof typeof signInJuryForm> = {
      Телефон: 'phone',
      Пароль: 'password',
    }
    const key = mapper[field]
    const type = field.toLowerCase().includes('пароль') ? 'password' : 'text'
    return (
      <input
        className={styles.input}
        key={field}
        onChange={(event) => authFormStore.setSignInJuryField(key, event.target.value)}
        placeholder={field}
        type={type}
        value={signInJuryForm[key]}
      />
    )
  }

  return (
    <section className={`${styles.page} ${!isOrganizerMode ? styles.pageJury : ''}`}>
      <div className={styles.overlay} />
      <div className={styles.panel}>
        <div className={styles.brandCard}>
          <div>
            <h1 className={styles.logo}>
              Смарт
              <br />
              Оценка
            </h1>
            <p className={styles.subtitle}>{currentView.subtitle}</p>
          </div>
          <button className={styles.backButton} onClick={() => navigate('/')} type="button">
            <span className={styles.arrow} aria-hidden>
              ←
            </span>
          </button>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>{currentView.title}</h2>
          </div>

          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault()
              void handleSubmit()
            }}
          >
            {currentView.fields.map((field) => renderInput(field))}
          </form>

          <div className={styles.actionArea}>
            <button
              className={styles.primaryButton}
              disabled={authFormStore.isLoading}
              onClick={() => void handleSubmit()}
              type="button"
            >
              {authFormStore.isLoading ? 'Подождите...' : currentView.submitText}
            </button>
            {currentView.secondaryAction ? (
              <button className={styles.secondaryButton} type="button">
                {currentView.secondaryAction}
              </button>
            ) : null}
            {authFormStore.error ? <p className={styles.errorText}>{authFormStore.error}</p> : null}
            {authFormStore.successMessage ? <p className={styles.successText}>{authFormStore.successMessage}</p> : null}
          </div>

          {canSwitchMode ? (
            <p className={styles.bottomText}>
              {currentView.bottomText}{' '}
              <button
                className={styles.linkButton}
                onClick={() => {
                  if (bottomTarget) {
                    changeView(bottomTarget)
                  }
                }}
                type="button"
              >
                {currentView.bottomLink}
              </button>
            </p>
          ) : null}
        </div>
      </div>
    </section>
  )
})
