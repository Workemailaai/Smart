import { observer } from 'mobx-react-lite'
import { useNavigate } from 'react-router'
import { userStore } from '@/entities/user'
import type { AuthView, ViewConfig } from '../../model/authPanel.types'
import { authViewStore } from '../../model/authViewStore'
import { authFormStore } from '../../model/authFormStore'
import styles from './AuthPanel.module.css'

const views: Record<AuthView, ViewConfig> = {
  signUpOrg: {
    title: 'Регистрация',
    subtitle: 'Профиль организатора',
    fields: ['Имя / Организация', '+7 999 999-99-99', 'Пароль', 'Повторите пароль'],
    submitText: 'Зарегистрироваться',
    secondaryAction: 'Быстрый вход через VK',
    bottomText: 'Уже зарегистрированы?',
    bottomLink: 'Войти',
    bottomTarget: 'signInOrg',
  },
  signInOrg: {
    title: 'Вход в систему',
    subtitle: 'Профиль организатора',
    fields: ['Телефон', 'Пароль'],
    submitText: 'Войти как организатор',
    secondaryAction: 'Быстрый вход через VK',
    bottomText: 'Нет аккаунта?',
    bottomLink: 'Зарегистрироваться',
    bottomTarget: 'signUpOrg',
  },
  signInJury: {
    title: 'Вход в систему',
    subtitle: 'Профиль жюри',
    fields: ['Телефон', 'Пароль'],
    submitText: 'Войти как жюри',
    bottomText: 'Вы организатор?',
    bottomLink: 'Войти как организатор',
    bottomTarget: 'signInOrg',
  },
}

export const AuthPanel = observer(() => {
  const navigate = useNavigate()
  const { signUpForm, signInOrgForm, signInJuryForm } = authFormStore

  const currentView = views[authViewStore.activeView]
  const changeView = (view: AuthView) => {
    authViewStore.setActiveView(view)
    authFormStore.resetStatus()
  }

  const handleSubmit = async () => {
    if (authViewStore.activeView === 'signUpOrg') {
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

    if (authViewStore.activeView === 'signInOrg') {
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
    if (authViewStore.activeView === 'signUpOrg') {
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

    if (authViewStore.activeView === 'signInOrg') {
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
    <div className={styles.panel}>
      <div className={styles.brandCard}>
        <h1 className={styles.logo}>Смарт Оценка</h1>
        <p className={styles.subtitle}>{currentView.subtitle}</p>
      </div>

      <div className={styles.formCard}>
        <div className={styles.topButtons}>
          <button
            className={authViewStore.activeView === 'signUpOrg' ? styles.activeNavButton : styles.navButton}
            onClick={() => changeView('signUpOrg')}
            type="button"
          >
            Зарегистрироваться
          </button>
          <button
            className={authViewStore.activeView === 'signInOrg' ? styles.activeNavButton : styles.navButton}
            onClick={() => changeView('signInOrg')}
            type="button"
          >
            Войти как организатор
          </button>
          <button
            className={authViewStore.activeView === 'signInJury' ? styles.activeNavButton : styles.navButton}
            onClick={() => changeView('signInJury')}
            type="button"
          >
            Войти как жюри
          </button>
        </div>

        <h2 className={styles.formTitle}>{currentView.title}</h2>

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
          <p className={styles.bottomText}>
            {currentView.bottomText}{' '}
            <button
              className={styles.linkButton}
              onClick={() => changeView(currentView.bottomTarget)}
              type="button"
            >
              {currentView.bottomLink}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
})
