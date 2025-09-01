const generateOtp = async (n: any) => {
    const val = Math.floor(Math.random() * (9 * Math.pow(10, n - 1))) + Math.pow(10, n - 1);
    console.log("vallalla",val)
    return val;
}
export {
    generateOtp
};

