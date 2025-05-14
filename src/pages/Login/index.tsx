import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

import { RootState, AppDispatch } from "../../stores/store";
import { login } from "../../stores/authenticationSlice";
import { FormCheck, FormInput, FormLabel } from "@/components/Base/Form";
import Tippy from "@/components/Base/Tippy";
import users from "@/fakers/users";
import Button from "@/components/Base/Button";

import clsx from "clsx";

import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import Lucide from "@/components/Base/Lucide";
// import { toast } from "react-toastify";
import logo from "../../assets/images/logo/zmh-logo.jpg";
import CompanyAdvertisement from "@/components/CompanyAdvertisement";
import { Eye, EyeOff } from "lucide-react";
import { Helmet } from "react-helmet-async";
import {
  setDashboardGlobalSearch,
  setFinhub,
} from "@/stores/authenticationSlice";

interface LoginFormInputs {
  email: string;
  password: string;
}

const Main: React.FC = () => {
  const navigate = useNavigate();
  const dispatch: AppDispatch = useAppDispatch();
  const [showPassword, setShowPassword] = useState(false);
  const { loading } = useAppSelector((state: RootState) => state.authentiction);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>();

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    try {
      const response = await dispatch(
        login({
          email: data.email,
          password: data.password,
        })
      ).unwrap();

      if (response.token) {
        localStorage.setItem("User", JSON.stringify(response));
        localStorage.setItem("token", response.token);
      }
      if (response?.company_id && response.company_name) {
        dispatch(
          setDashboardGlobalSearch({
            id: response?.company_id,
            ticker: response?.company_ticker!,
            name: response?.company_name,
          })
        );
        // toast.success("Logged In Successfully!");
      }
      if (response?.finnhub) {
        dispatch(setFinhub(response?.finnhub));
      }

      const redirectPath = sessionStorage.getItem('redirectPath') || '/';
      sessionStorage.removeItem('redirectPath');

      if (redirectPath) {
        navigate(redirectPath);
      }
      else {
        navigate(`/?ticker=${response?.company_ticker}`);
      }

    } catch (error) {}
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
              <div className="flex items-center justify-center w-full rounded-sm h-full  from-theme-1 to-theme-2/80 transition-transform ease-in-out group-[.side-menu--collapsed.side-menu--on-hover]:xl:-rotate-[360px]">
                <div className="w-full h-full overflow-hidden    image-fit">
                  <img alt="Logo" src={logo} />
                </div>
              </div>
            </div>
            <div className="mt-10">
              <div className="text-2xl font-medium">Sign In</div>
              <div className="mt-2.5 text-slate-600">
                Don't have an account?
                <Link className="ml-2 font-medium text-primary" to="/register">
                  Sign Up
                </Link>
              </div>

              <div className="mt-6">
                <form onSubmit={handleSubmit(onSubmit)}>
                  <FormLabel>Email*</FormLabel>
                  <FormInput
                    type="text"
                    className="block px-4 py-3.5 rounded-[0.6rem] border-slate-300/80"
                    placeholder="Enter Email"
                    {...register("email", { required: "Email is required" })}
                  />
                  {errors.email && (
                    <p className="text-red-500">{errors.email.message}</p>
                  )}
                  <FormLabel className="mt-4">Password*</FormLabel>
                  <div className="relative">
                    <FormInput
                      type={showPassword ? "text" : "password"}
                      className="block px-4 py-3.5 rounded-[0.6rem] border-slate-300/80"
                      placeholder="Enter your password"
                      {...register("password", {
                        required: "Password is required",
                      })}
                    />
                    <span className="absolute top-[28%] right-[5%] cursor-pointer">
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
                  </div>

                  {errors.password && (
                    <p className="text-red-500">{errors.password.message}</p>
                  )}
                  <div className="flex mt-4 text-xs text-slate-500 sm:text-sm">
                    <div className="flex items-center mr-auto">
                      <FormCheck.Input
                        id="remember-me"
                        type="checkbox"
                        className="mr-2.5 border"
                      />
                      <label
                        className="cursor-pointer select-none"
                        htmlFor="remember-me"
                      >
                        Remember me
                      </label>
                    </div>
                    {/* <a href="">Forgot Password?</a> */}
                  </div>
                  <div className="mt-5 text-center xl:mt-8 xl:text-left">
                    <Button
                      variant="primary"
                      rounded
                      className="bg-gradient-to-r from-theme-1/70 to-theme-2/70 w-full py-3.5 xl:mr-3"
                      type="submit"
                      disabled={loading}
                    >
                      {loading && (
                        <Lucide
                          icon="Loader"
                          className={`w-4 h-4 mr-1.5 stroke-[1.3] ${
                            loading ? "animate-spin" : ""
                          }`}
                        />
                      )}
                      Log In
                    </Button>
                  </div>
                </form>
              </div>
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
};

export default Main;
