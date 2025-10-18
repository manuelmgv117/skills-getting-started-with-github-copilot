import os, sys
from fastapi.testclient import TestClient

CURRENT_DIR = os.path.dirname(__file__)
REPO_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, ".."))
if REPO_ROOT not in sys.path:
    sys.path.append(REPO_ROOT)

from src.app import app, activities

client = TestClient(app)

def test_root_redirects_to_static():
    res = client.get("/")
    assert res.status_code in (302, 307)
    assert "static/index.html" in res.headers.get("location", "")

def test_get_activities_returns_dict_with_min_items():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    assert len(data) >= 4

def test_signup_then_duplicate_is_rejected():
    activity_name = next(iter(activities.keys()))
    email = "test_student@mergington.edu"

    activities[activity_name]["participants"] = [
        p for p in activities[activity_name]["participants"] if p != email
    ]

    r1 = client.post(f"/activities/{activity_name}/signup", params={"email": email})
    assert r1.status_code == 200

    r2 = client.post(f"/activities/{activity_name}/signup", params={"email": email})
    assert r2.status_code == 400
    assert "already" in r2.json().get("detail", "").lower()

def test_unregister_success():
    activity_name = next(iter(activities.keys()))
    email = "to_remove@mergington.edu"
    if email not in activities[activity_name]["participants"]:
        activities[activity_name]["participants"].append(email)

    r = client.delete(
        f"/activities/{activity_name}/unregister",
        params={"email": email},
    )
    assert r.status_code == 200
    assert email not in activities[activity_name]["participants"]
