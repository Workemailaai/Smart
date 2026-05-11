export interface IUser {
    id: number
    fullName: string
    phone: string
    role: string
}

export interface ISignUpData {
    fullName: string
    phone: string
    password: string
}

export interface ISignInData {
    phone: string
    password: string
    role: 'organizer' | 'jury'
}

export interface IAuthResponseData {
    accessToken: string
    user: IUser
}