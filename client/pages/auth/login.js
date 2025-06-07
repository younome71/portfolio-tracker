﻿import AuthForm from '../../components/AuthForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <AuthForm isLogin={true} />
    </div>
  );
}
