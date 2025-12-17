from playwright.sync_api import sync_playwright
import json
FRONTEND = "http://127.0.0.1:5005/"
ML_ENDPOINT_PATH = "/predict/unified"
def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Capture console messages for debugging
        console_msgs = []
        page.on("console", lambda msg: console_msgs.append((msg.type, msg.text)))
        # Navigate to frontend
        page.goto(FRONTEND, timeout=15000)
        # Wait for global mlClient to be defined (ml-client.js should set window.mlClient)
        try:
            page.wait_for_function("() => typeof window.mlClient !== 'undefined'", timeout=5000)
        except Exception as e:
            print("ERROR: mlClient not initialized on page:", e)
            print("Console messages:")
            for t, m in console_msgs:
                print(t, m)
            browser.close()
            raise
        # Trigger a prediction via the client and wait for the network response
        sample_summary = "E2E test: fallo en autenticación"
        sample_description = "Prueba automática desde Playwright"
        # Wait for the ML endpoint response
        with page.expect_response(lambda r: ML_ENDPOINT_PATH in r.url and r.request.method == 'POST', timeout=15000) as resp_info:
            # Call predictAll on the page; Playwright will await the promise
            result = page.evaluate(
                "(args) => window.mlClient.predictAll(args.summary, args.description)",
                {"summary": sample_summary, "description": sample_description},
            )
        response = resp_info.value
        status = response.status
        body = response.text()
        print("ML endpoint response status:", status)
        print("ML endpoint response preview:", body[:1000])
        # Basic assertions
        assert status == 200, f"ML endpoint returned non-200: {status}"
        data = json.loads(body)
        assert 'priority' in data or 'priority' in data.get('priority', {} ) or 'priority' in data, "No priority in response"
        print("E2E test passed: frontend -> ML integration OK")
        browser.close()
if __name__ == '__main__':
    run_test()
