export const validatorsLib = {
  isValidMobile: (tel: string) => /^\+?[1-9]\d{1,14}$/.test(tel)
};
