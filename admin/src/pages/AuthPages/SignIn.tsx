import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Waqar-e-Makkah Travel SignIn Dashboard"
        description="This is Admin SignIn Dashboard page for Waqar-e-Makkah Travel"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
