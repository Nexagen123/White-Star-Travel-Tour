import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="White Start Travel & Tour SignIn Dashboard"
        description="This is Admin SignIn Dashboard page for White Start Travel & Tour"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
