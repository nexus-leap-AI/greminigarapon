// ==========================================================================
// 【管理・編集用 設定エリア】 初心者の方はこちらを編集してください
// ==========================================================================
const CONFIG = {
    // 抽選が回る時間（ミリ秒単位 / 1000ms = 1秒）
    spinDuration: 3500, // 3.5秒

    // メッセージ文言の設定
    messages: {
        titleNew: "見事当選！",
        titleAlready: "本日の抽選は完了しています",
        staffNotice: "⚠️ スタッフにこの画面を見せてください",
        errorParam: "QRコードからアクセスしてください。"
    },

    // 等級ごとの設定（当選確率、名前、景品リスト）
    // ※ 確率(probability)の合計がちょうど100になるように設定してください。
    prizes: [
        {
            grade: "1等",
            probability: 5, // 5%の確率
            items: ["おもちゃA", "日用品A"] // この中からランダムで1つ選ばれます
        },
        {
            grade: "2等",
            probability: 15, // 15%の確率
            items: ["おもちゃB", "日用品B"]
        },
        {
            grade: "3等",
            probability: 30, // 30%の確率
            items: ["おもちゃC", "日用品C"]
        },
        {
            grade: "参加賞",
            probability: 50, // 50%の確率
            items: ["ポケットティッシュ", "お菓子"]
        }
    ]
};

// ==========================================================================
// アプリケーション ロジック (ここから下は原則変更不要です)
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
    // HTML要素の取得
    const errorScreen = document.getElementById("error-screen");
    const mainScreen = document.getElementById("main-screen");
    const spinButton = document.getElementById("spin-button");
    const garaponBody = document.getElementById("garapon-body");
    const resultPopup = document.getElementById("result-popup");
    const resultTitle = document.getElementById("result-title");
    const resultGrade = document.getElementById("result-grade");
    const resultItem = document.getElementById("result-item");
    const resultDate = document.getElementById("result-date");
    const confettiContainer = document.getElementById("confetti-container");

    // URLからパラメータ「user」を取得
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get("user");

    // 今日の日付を取得 (フォーマット: YYYY-MM-DD)
    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${date}`;
    };

    const todayStr = getTodayString();

    // 1. URLパラメータチェック
    if (!userId || userId.trim() === "") {
        // パラメータがない場合はエラー画面を表示して終了
        errorScreen.classList.remove("hidden");
        return;
    }

    // パラメータがある場合はメイン画面を表示
    mainScreen.classList.remove("hidden");

    // 2. localStorageを使った1日1回制限のチェック
    // 保存データキー: garapon_user_【ユーザーID】
    const storageKey = `garapon_user_${userId}`;
    const savedData = localStorage.getItem(storageKey);

    if (savedData) {
        const parsedData = JSON.parse(savedData);
        // 保存されている日付が今日と同じかチェック
        if (parsedData.date === todayStr) {
            // すでに今日抽選済みの場合は、即座に過去の結果をポップアップ表示
            showResultPopup(parsedData.grade, parsedData.item, parsedData.formattedDate, true);
        }
    }

    // 3. 抽選ボタンが押されたときの処理
    spinButton.addEventListener("click", () => {
        // 連打防止：ボタンを無効化
        spinButton.disabled = true;

        // ガラポン回転アニメーションを開始
        garaponBody.classList.add("spinning");

        // 確率に基づいて抽選を実行
        const lotteryResult = executeLottery();

        // 抽選結果と現在時刻を保存用にまとめる
        const now = new Date();
        const formattedDate = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        const dataToSave = {
            date: todayStr,
            grade: lotteryResult.grade,
            item: lotteryResult.item,
            formattedDate: formattedDate
        };

        // localStorageに結果を保存（1日1回制限用）
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));

        // 設定された秒数（3〜5秒）が経過した後に結果を表示
        setTimeout(() => {
            // アニメーションをストップ
            garaponBody.classList.remove("spinning");
            // 結果ポップアップを表示（新規当選なので isAlreadyPlayed は false）
            showResultPopup(lotteryResult.grade, lotteryResult.item, formattedDate, false);
        }, CONFIG.spinDuration);
    });

    // 4. 抽選ロジック本体
    function executeLottery() {
        // 0〜99の乱数を生成
        const randomNum = Math.floor(Math.random() * 100);
        let currentRange = 0;
        let selectedPrize = null;

        // まず確率を元に「等級」を決定
        for (const prize of CONFIG.prizes) {
            currentRange += prize.probability;
            if (randomNum < currentRange) {
                selectedPrize = prize;
                break;
            }
        }

        // 万が一漏れた場合の安全策（末尾の等級にする）
        if (!selectedPrize) {
            selectedPrize = CONFIG.prizes[CONFIG.prizes.length - 1];
        }

        // 決定した等級のアイテムリストから、さらにランダムで1つ選ぶ
        const items = selectedPrize.items;
        const randomItemIndex = Math.floor(Math.random() * items.length);
        const selectedItem = items[randomItemIndex];

        return {
            grade: selectedPrize.grade,
            item: selectedItem
        };
    }

    // 5. 結果ポップアップ表示処理
    function showResultPopup(grade, item, dateText, isAlreadyPlayed) {
        // 初めてか、2回目以降かでタイトルを変更
        if (isAlreadyPlayed) {
            resultTitle.textContent = CONFIG.messages.titleAlready;
            spinButton.disabled = true; // 2回目以降ならメイン画面のボタンもロック
        } else {
            resultTitle.textContent = CONFIG.messages.titleNew;
            // 新規当選時のみ紙吹雪を降らせる
            startConfetti();
        }

        // 等級と景品名を画面にセット
        resultGrade.textContent = grade;
        resultItem.textContent = item;
        resultDate.textContent = `確認日時：${dateText}`;

        // ポップアップを表示
        resultPopup.classList.remove("hidden");
    }

    // 6. 紙吹雪の演出エフェクト
    function startConfetti() {
        const colors = ['#ffeb3b', '#ff5722', '#e91e63', '#00bcd4', '#4caf50', '#ffffff'];
        const confettiCount = 80; // 紙吹雪の枚数

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement("div");
            confetti.classList.add("confetti");
            
            // ランダムな配置とアニメーションの設定
            confetti.style.left = Math.random() * 100 + "vw";
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + "s";
            confetti.style.animationDuration = (Math.random() * 2 + 2) + "s"; // 2〜4秒で落下
            
            // 形（正方形や長方形など）をランダムに
            confetti.style.width = (Math.random() * 8 + 6) + "px";
            confetti.style.height = (Math.random() * 8 + 6) + "px";

            confettiContainer.appendChild(confetti);
        }
    }
});