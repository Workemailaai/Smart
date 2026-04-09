export type AuthView = 'signUpOrg' | 'signInOrg' | 'signInJury'

export type SignUpPayload = {
  fullName: string
  phone: string
  password: string
}

export type SignInPayload = {
  phone: string
  password: string
}

export type SignUpForm = {
  fullName: string
  phone: string
  password: string
  repeatPassword: string
}

export type SignInOrgForm = {
  phone: string
  password: string
}

export type SignInJuryForm = {
  phone: string
  password: string
}

export type ViewConfig = {
  title: string
  subtitle: string
  fields: string[]
  submitText: string
  secondaryAction?: string
  bottomText: string
  bottomLink: string
  bottomTarget: AuthView
}
