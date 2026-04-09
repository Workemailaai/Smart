export type ServerResponseType<ParamsType = null> = {
    statusCode: number;
    message: string;
    data: ParamsType;
    error?: string | null;
  };