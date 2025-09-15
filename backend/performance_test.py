"""认证性能测试脚本"""
import statistics
import time

import requests

API_BASE = "http://localhost:8000/api/v1"

def test_login_performance(email="test@example.com", password="testpassword"):
    """测试登录性能"""
    start_time = time.time()

    try:
        response = requests.post(
            f"{API_BASE}/login/access-token",
            data={"username": email, "password": password}
        )
        end_time = time.time()

        if response.status_code == 200:
            return end_time - start_time, True
        else:
            return end_time - start_time, False

    except Exception:
        return time.time() - start_time, False

def test_token_verification(token):
    """测试token验证性能"""
    start_time = time.time()

    try:
        response = requests.get(
            f"{API_BASE}/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        end_time = time.time()

        return end_time - start_time, response.status_code == 200

    except Exception:
        return time.time() - start_time, False

def benchmark_auth_system():
    """基准测试认证系统性能"""
    print("🔍 开始认证系统性能测试...")

    # 测试登录性能 (10次)
    login_times = []
    successful_logins = 0

    for i in range(10):
        duration, success = test_login_performance()
        login_times.append(duration)
        if success:
            successful_logins += 1
        print(f"   登录测试 {i+1}/10: {duration:.3f}s {'✅' if success else '❌'}")

    print("\n📊 登录性能统计:")
    print(f"   成功率: {successful_logins}/10 ({successful_logins*10}%)")
    print(f"   平均时间: {statistics.mean(login_times):.3f}s")
    print(f"   最快时间: {min(login_times):.3f}s")
    print(f"   最慢时间: {max(login_times):.3f}s")

    # 如果有成功登录，测试token验证性能
    if successful_logins > 0:
        # 获取一个有效token
        response = requests.post(
            f"{API_BASE}/login/access-token",
            data={"username": "test@example.com", "password": "testpassword"}
        )

        if response.status_code == 200:
            token = response.json()["access_token"]

            # 测试token验证性能
            verification_times = []
            successful_verifications = 0

            for i in range(20):  # 测试更多次数，因为应该有缓存效果
                duration, success = test_token_verification(token)
                verification_times.append(duration)
                if success:
                    successful_verifications += 1
                print(f"   验证测试 {i+1}/20: {duration:.3f}s {'✅' if success else '❌'}")

            print("\n📊 Token验证性能统计:")
            print(f"   成功率: {successful_verifications}/20 ({successful_verifications*5}%)")
            print(f"   平均时间: {statistics.mean(verification_times):.3f}s")
            print(f"   最快时间: {min(verification_times):.3f}s")
            print(f"   最慢时间: {max(verification_times):.3f}s")

            # 分析缓存效果
            first_half = verification_times[:10]
            second_half = verification_times[10:]
            print(f"   前10次平均: {statistics.mean(first_half):.3f}s")
            print(f"   后10次平均: {statistics.mean(second_half):.3f}s")

            if statistics.mean(second_half) < statistics.mean(first_half):
                print("   🎯 检测到缓存加速效果!")

if __name__ == "__main__":
    benchmark_auth_system()
