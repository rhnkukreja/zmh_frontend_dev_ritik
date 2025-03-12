import { FormInput, FormLabel } from "@/components/Base/Form";

import Button from "@/components/Base/Button";
import clsx from "clsx";
import _ from "lodash";

import { Link, useNavigate } from "react-router-dom";
import { Controller, SubmitHandler, useForm } from "react-hook-form";

import { AppDispatch, RootState } from "@/stores/store";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { signUp } from "@/stores/authenticationSlice";
import Lucide from "@/components/Base/Lucide";
import { toast } from "react-toastify";
import logo from "../../assets/images/logo/zmh-logo.jpg";
import CompanyAdvertisement from "@/components/CompanyAdvertisement";
import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Helmet } from "react-helmet-async";
import CompanySelect from "@/components/ReactSelectAsync";

interface FormInputs {
  first_name: string;
  last_name: string;
  company?: {
    value: number;
    label: string;
  };
  email: string;
  password: string;
  passwordConfirmation: string;
}

function Main() {
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInputs>();
  const companySelectRef = useRef<any>(null);
  const dispatch: AppDispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading } = useAppSelector((state: RootState) => state.authentiction);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    const { passwordConfirmation, ...restData } = data;

    try {
      const response = await dispatch(
        signUp({
          ...restData,
          user_type: "Admin",
          phone: "",
          username: restData?.email,
          company: restData?.company?.value || null,
        })
      ).unwrap();

      if (response?.email) {
        toast.success("Registered Successfully!");
        navigate("/login");
      }
    } catch (error) {
      return error;
    }
  };

  return (
    <>
      <Helmet>
        <title>ZMH Analytics - ZMH Advisors</title>
      </Helmet>
      <div className="container grid lg:h-screen grid-cols-12 lg:max-w-[1550px] 2xl:max-w-[1750px] py-10 px-5 sm:py-14 sm:px-10 md:px-36 lg:py-0 lg:pl-14 lg:pr-12 xl:px-24">
        <div
          className={clsx([
            "relative z-50 h-full col-span-12 p-7 sm:p-14 bg-white rounded-2xl lg:bg-transparent lg:pr-10 lg:col-span-5 xl:pr-24 2xl:col-span-4 lg:p-0",
            "before:content-[''] before:absolute before:inset-0 before:-mb-3.5 before:bg-white/40 before:rounded-2xl before:mx-5",
          ])}
        >
          <div className="relative z-10 flex flex-col justify-center w-full h-full py-2 lg:py-32">
            <div className="rounded-[0.8rem] w-[55px] h-[55px]  flex items-center justify-center">
              <div className="flex items-center justify-center w-full rounded-sm h-full  from-theme-1 to-theme-2/80 transition-transform ease-in-out group-[.side-menu--collapsed.side-menu--on-hover]:xl:-rotate-360">
                <div className="w-full h-full overflow-hidden     image-fit">
                  <img alt="Logo" src={logo} />
                </div>
              </div>
            </div>
            <div className="mt-10">
              <div className="text-2xl font-medium">Sign Up</div>
              <div className="mt-2.5 text-slate-600">
                Already have an account?
                <Link className="ml-2 font-medium text-primary" to="/login">
                  Sign In
                </Link>
              </div>
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
                <div>
                  <FormLabel>First Name*</FormLabel>
                  <FormInput
                    type="text"
                    className="block px-4 py-3.5 rounded-[0.6rem] border-slate-300/80"
                    placeholder="Enter First Name"
                    {...register("first_name", {
                      required: "First name is required",
                    })}
                  />
                  {errors.first_name && (
                    <span className="text-red-500">
                      {errors.first_name.message}
                    </span>
                  )}
                </div>
                <div className="mt-5">
                  <FormLabel>Last Name*</FormLabel>
                  <FormInput
                    type="text"
                    className="block px-4 py-3.5 rounded-[0.6rem] border-slate-300/80"
                    placeholder="Enter Last Name"
                    {...register("last_name", {
                      required: "Last name is required",
                    })}
                  />
                  {errors.last_name && (
                    <span className="text-red-500">
                      {errors.last_name.message}
                    </span>
                  )}
                </div>
                <div className="mt-5">
                  <FormLabel>Email*</FormLabel>
                  <FormInput
                    type="email"
                    className="block px-4 py-3.5 rounded-[0.6rem] border-slate-300/80"
                    placeholder="Enter Email"
                    {...register("email", { required: "Email is required" })}
                  />
                  {errors.email && (
                    <span className="text-red-500">{errors.email.message}</span>
                  )}
                </div>

                <div className="w-full mt-5" ref={companySelectRef}>
                  <FormLabel>Select Company</FormLabel>
                  <Controller
                    name="company"
                    control={control}
                    render={({ field }) => (
                      <CompanySelect
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                        }}
                      />
                    )}
                  />
                </div>
                <div className="mt-5 relative">
                  <FormLabel>Password*</FormLabel>
                  <FormInput
                    type={showPassword ? "text" : "password"}
                    className="block px-4 py-3.5 rounded-[0.6rem] border-slate-300/80"
                    placeholder="Enter Password"
                    {...register("password", {
                      required: "Password is required",
                    })}
                  />
                  <span className="absolute top-[52%] right-[5%] cursor-pointer">
                    {showPassword && (
                      <Eye
                        onClick={() => setShowPassword(!showPassword)}
                        strokeWidth={0.75}
                        size={20}
                      />
                    )}
                    {!showPassword && (
                      <EyeOff
                        onClick={() => setShowPassword(!showPassword)}
                        strokeWidth={0.75}
                        size={20}
                      />
                    )}
                  </span>
                  {errors.password && (
                    <span className="text-red-500">
                      {errors.password.message}
                    </span>
                  )}
                </div>

                <div className="mt-5 relative">
                  <FormLabel>Password Confirmation*</FormLabel>
                  <FormInput
                    type={showConfirmPassword ? "text" : "password"}
                    className="block px-4 py-3.5 rounded-[0.6rem] border-slate-300/80"
                    placeholder="Enter Confirm Password"
                    {...register("passwordConfirmation", {
                      required: "Password confirmation is required",
                      validate: (value) =>
                        value === watch("password") || "Passwords do not match",
                    })}
                  />
                  <span className="absolute top-[52%] right-[5%] cursor-pointer">
                    {showConfirmPassword && (
                      <Eye
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        strokeWidth={0.75}
                        size={20}
                      />
                    )}
                    {!showConfirmPassword && (
                      <EyeOff
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        strokeWidth={0.75}
                        size={20}
                      />
                    )}
                  </span>
                  {errors.passwordConfirmation && (
                    <span className="text-red-500">
                      {errors.passwordConfirmation.message}
                    </span>
                  )}
                </div>

                {/* <div className="flex items-center mt-5 text-xs text-slate-500 sm:text-sm">
                  <Controller
                    name="agreeToPolicy"
                    control={control}
                    rules={{
                      required: "You must agree to the privacy policy",
                    }}
                    render={({ field }) => (
                      <FormCheck.Input
                        id="agree-to-policy"
                        type="checkbox"
                        className="mr-2 border"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    )}
                  />
                  <label
                    className="cursor-pointer select-none"
                    htmlFor="agree-to-policy"
                  >
                    I agree to the
                  </label>
                  <a className="ml-1 text-primary dark:text-slate-200" href="">
                    Privacy Policy
                  </a>
                  .
                </div>
                {errors.agreeToPolicy && (
                  <span className="text-red-500">
                    {errors.agreeToPolicy.message}
                  </span>
                )} */}
                <div className="mt-5 text-center xl:mt-8 xl:text-left">
                  <Button
                    type="submit"
                    variant="primary"
                    rounded
                    disabled={loading}
                    className="bg-gradient-to-r from-theme-1/70 to-theme-2/70 w-full py-3.5 xl:mr-3"
                  >
                    {loading && (
                      <Lucide
                        icon="Loader"
                        className={`w-4 h-4 mr-1.5 stroke-[1.3] ${
                          loading ? "animate-spin" : ""
                        }`}
                      />
                    )}
                    Sign Up
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed container grid w-screen inset-0 h-screen grid-cols-12 lg:max-w-[1550px] 2xl:max-w-[1750px] pl-14 pr-12 xl:px-24">
        <div
          className={clsx([
            "relative h-screen col-span-12 lg:col-span-5 2xl:col-span-4 z-20",
            "after:bg-white after:hidden after:lg:block after:content-[''] after:absolute after:right-0 after:inset-y-0 after:bg-gradient-to-b after:from-white after:to-slate-100/80 after:w-[800%] after:rounded-[0_1.2rem_1.2rem_0/0_1.7rem_1.7rem_0]",
            "before:content-[''] before:hidden before:lg:block before:absolute before:right-0 before:inset-y-0 before:my-6 before:bg-gradient-to-b before:from-white/10 before:to-slate-50/10 before:bg-white/50 before:w-[800%] before:-mr-4 before:rounded-[0_1.2rem_1.2rem_0/0_1.7rem_1.7rem_0]",
          ])}
        ></div>
        <div
          className={clsx([
            "h-full col-span-7 2xl:col-span-8 lg:relative",
            "before:content-[''] before:absolute before:lg:-ml-10 before:left-0 before:inset-y-0 before:bg-gradient-to-b before:from-theme-1 before:to-theme-2 before:w-screen before:lg:w-[800%]",
            "after:content-[''] after:absolute after:inset-y-0 after:left-0 after:w-screen after:lg:w-[800%] after:bg-texture-white after:bg-fixed after:bg-center after:lg:bg-[25rem_-25rem] after:bg-no-repeat",
          ])}
        >
          <div className="sticky top-0 z-10 flex-col justify-center hidden h-screen ml-16 lg:flex xl:ml-28 2xl:ml-36">
            <CompanyAdvertisement />
          </div>
        </div>
      </div>
      {/* <ThemeSwitcher /> */}
    </>
  );
}

export default Main;
