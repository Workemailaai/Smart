import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useNavigate } from 'react-router'
import { userStore } from '@/entities/user'
import type { AuthPanelMode, ViewConfig } from '../../model/authPanel.types'
import { authFormStore } from '../../model/authFormStore'
import {
  formatRuPhoneMask,
  isCompleteRuPhone,
  normalizePhoneDigits,
  ruPhoneMaskOnKeyDown,
} from '@/shared/lib/ruPhone'
import styles from './AuthPanel.module.css'

type AuthPanelProps = {
  mode: AuthPanelMode
}

const views: Record<AuthPanelMode, ViewConfig> = {
  signUpOrg: {
    title: 'Регистрация',
    subtitle: 'Профиль организатора',
    fields: ['Имя / Организация', '+7 (999) 656-86-85', 'Пароль', 'Повторите пароль'],
    submitText: 'Зарегистрироваться',
    bottomText: 'Уже зарегистрированы?',
    bottomLink: 'Войти',
    bottomTarget: 'signInOrg'
  },
  signInOrg: {
    title: 'Вход в систему',
    subtitle: 'Профиль организатора',
    fields: ['Телефон', 'Пароль'],
    submitText: 'Войти',
    bottomText: 'Нет аккаунта?',
    bottomLink: 'Зарегистрироваться',
    bottomTarget: 'signUpOrg'
  },
  signInJury: {
    title: 'Вход в систему',
    subtitle: 'Профиль жюри',
    fields: ['Телефон', 'Пароль'],
    submitText: 'Войти'
  }
}

const authModePath: Record<AuthPanelMode, string> = {
  signUpOrg: '/auth/organizer/sign-up',
  signInOrg: '/auth/organizer/sign-in',
  signInJury: '/auth/jury/sign-in'
}

type SignUpPasswordFieldKey = 'password' | 'repeatPassword'

export const AuthPanel = observer(({ mode }: AuthPanelProps) => {
  const navigate = useNavigate()
  const { signUpForm, signInOrgForm, signInJuryForm } = authFormStore

  const [signUpPasswordVisibility, setSignUpPasswordVisibility] = useState<Record<SignUpPasswordFieldKey, boolean>>({
    password: false,
    repeatPassword: false,
  })

  const [isSignInOrgPasswordVisible, setIsSignInOrgPasswordVisible] = useState(false)

  const [isSignInJuryPasswordVisible, setIsSignInJuryPasswordVisible] = useState(false)

  const toggleSignUpPasswordVisibility = (fieldKey: SignUpPasswordFieldKey) => {
    setSignUpPasswordVisibility((previous) => ({
      ...previous,
      [fieldKey]: !previous[fieldKey],
    }))
  }

  const renderPasswordRow = (
    fieldLabel: string,
    value: string,
    onValueChange: (nextValue: string) => void,
    isVisible: boolean,
    onToggleVisibility: () => void,
    autoCompleteMode: 'new-password' | 'current-password',
  ) => (
    <div className={styles.passwordField} key={fieldLabel}>
      <input
        autoComplete={autoCompleteMode}
        className={styles.inputPassword}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={fieldLabel}
        type={isVisible ? 'text' : 'password'}
        value={value}
      />
      <button
        aria-label={isVisible ? 'Скрыть пароль' : 'Показать пароль'}
        className={styles.passwordToggle}
        onClick={onToggleVisibility}
        type="button"
      >
        <img
          alt=""
          className={styles.passwordToggleIcon}
          height={24}
          src={isVisible ? '/auth-eye-slash.svg' : '/auth-eye-open.svg'}
          width={24}
        />
      </button>
    </div>
  )

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
      if (!signUpForm.fullName || !isCompleteRuPhone(signUpForm.phone) || !signUpForm.password || !signUpForm.repeatPassword) {
        authFormStore.setError('Заполните все поля регистрации')
        return
      }

      if (signUpForm.password !== signUpForm.repeatPassword) {
        authFormStore.setError('Пароли не совпадают')
        return
      }

      await authFormStore.signUpOrganizer({
        fullName: signUpForm.fullName,
        phone: normalizePhoneDigits(signUpForm.phone),
        password: signUpForm.password,
      })
      if (userStore.user) {
        navigate('/cabinet/events')
      }
      return
    }

    if (mode === 'signInOrg') {
      if (!isCompleteRuPhone(signInOrgForm.phone) || !signInOrgForm.password) {
        authFormStore.setError('Заполните телефон и пароль')
        return
      }

      await authFormStore.signInOrganizer({
        phone: normalizePhoneDigits(signInOrgForm.phone),
        password: signInOrgForm.password,
      })
      if (userStore.user) {
        navigate('/cabinet/events')
      }
      return
    }

    if (!isCompleteRuPhone(signInJuryForm.phone) || !signInJuryForm.password) {
      authFormStore.setError('Заполните телефон и пароль')
      return
    }

    await authFormStore.signInJury({
      phone: normalizePhoneDigits(signInJuryForm.phone),
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
        '+7 (999) 656-86-85': 'phone',
        Пароль: 'password',
        'Повторите пароль': 'repeatPassword',
      }
      const key = mapper[field]
      const isPhone = key === 'phone'
      const isPasswordField = key === 'password' || key === 'repeatPassword'

      if (isPasswordField) {
        const isVisible = signUpPasswordVisibility[key]

        return renderPasswordRow(
          field,
          signUpForm[key],
          (nextValue) => authFormStore.setSignUpField(key, nextValue),
          isVisible,
          () => toggleSignUpPasswordVisibility(key),
          'new-password',
        )
      }

      const type = isPhone ? 'tel' : 'text'
      return (
        <input
          className={styles.input}
          key={field}
          onChange={(event) =>
            authFormStore.setSignUpField(
              key,
              (isPhone ? formatRuPhoneMask(event.target.value) : event.target.value) as (typeof signUpForm)[typeof key],
            )
          }
          onKeyDown={
            isPhone
              ? (e) =>
                  ruPhoneMaskOnKeyDown(e, signUpForm.phone, (v) => {
                    authFormStore.setSignUpField('phone', v)
                  })
              : undefined
          }
          placeholder={isPhone ? '+7 (999) 656-86-85' : field}
          type={type}
          inputMode={isPhone ? 'numeric' : undefined}
          autoComplete={isPhone ? 'tel-national' : undefined}
          value={isPhone ? formatRuPhoneMask(signUpForm.phone) : signUpForm[key]}
        />
      )
    }

    if (mode === 'signInOrg') {
      const mapper: Record<string, keyof typeof signInOrgForm> = {
        Телефон: 'phone',
        Пароль: 'password',
      }
      const key = mapper[field]
      const isPhone = key === 'phone'

      if (key === 'password') {
        return renderPasswordRow(
          field,
          signInOrgForm.password,
          (nextValue) => authFormStore.setSignInOrgField('password', nextValue),
          isSignInOrgPasswordVisible,
          () => setIsSignInOrgPasswordVisible((previous) => !previous),
          'current-password',
        )
      }

      const type = isPhone ? 'tel' : 'text'
      return (
        <input
          className={styles.input}
          key={field}
          onChange={(event) =>
            authFormStore.setSignInOrgField(
              key,
              (isPhone ? formatRuPhoneMask(event.target.value) : event.target.value) as (typeof signInOrgForm)[typeof key],
            )
          }
          onKeyDown={
            isPhone
              ? (e) =>
                  ruPhoneMaskOnKeyDown(e, signInOrgForm.phone, (v) => {
                    authFormStore.setSignInOrgField('phone', v)
                  })
              : undefined
          }
          placeholder={isPhone ? '+7 (999) 656-86-85' : field}
          type={type}
          inputMode={isPhone ? 'numeric' : undefined}
          autoComplete={isPhone ? 'tel-national' : undefined}
          value={isPhone ? formatRuPhoneMask(signInOrgForm.phone) : signInOrgForm[key]}
        />
      )
    }

    const mapper: Record<string, keyof typeof signInJuryForm> = {
      Телефон: 'phone',
      Пароль: 'password',
    }
    const key = mapper[field]
    const isPhone = key === 'phone'

    if (key === 'password') {
      return renderPasswordRow(
        field,
        signInJuryForm.password,
        (nextValue) => authFormStore.setSignInJuryField('password', nextValue),
        isSignInJuryPasswordVisible,
        () => setIsSignInJuryPasswordVisible((previous) => !previous),
        'current-password',
      )
    }

    const type = isPhone ? 'tel' : 'text'
    return (
      <input
        className={styles.input}
        key={field}
        onChange={(event) =>
          authFormStore.setSignInJuryField(
            key,
            (isPhone ? formatRuPhoneMask(event.target.value) : event.target.value) as (typeof signInJuryForm)[typeof key],
          )
        }
        onKeyDown={
          isPhone
            ? (e) =>
                ruPhoneMaskOnKeyDown(e, signInJuryForm.phone, (v) => {
                  authFormStore.setSignInJuryField('phone', v)
                })
            : undefined
        }
        placeholder={isPhone ? '+7 (999) 656-86-85' : field}
        type={type}
        inputMode={isPhone ? 'numeric' : undefined}
        autoComplete={isPhone ? 'tel-national' : undefined}
        value={isPhone ? formatRuPhoneMask(signInJuryForm.phone) : signInJuryForm[key]}
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
          {mode === 'signInJury' ? (
            <div className={styles.juryMobileTopBar}>
              <button
                className={styles.juryBackToMain}
                onClick={() => navigate('/')}
                type="button"
                aria-label="К выбору роли: организатор или жюри"
              >
                <img className={styles.juryBackArrowIcon} src="/back-button.svg" alt="" aria-hidden width={40} height={40} />
              </button>
              <h2 className={styles.juryMobileTitle}>{currentView.title}</h2>
            </div>
          ) : null}

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
