"""NumPy reference implementations for ML/DL written exercises."""
import json
import numpy as np


def sigmoid(z):
    return np.exp(-np.logaddexp(0.0, -np.asarray(z, dtype=float)))


def supervised_data(x, y, binary=False):
    x, y = np.asarray(x, dtype=float), np.asarray(y)
    if x.ndim != 2 or not x.size or y.shape != (len(x),):
        raise ValueError("Expected nonempty X (n,d) and y (n,)")
    if not np.isfinite(x).all() or not np.isfinite(y).all():
        raise ValueError("Inputs must be finite")
    if binary and not np.isin(y, [0, 1]).all():
        raise ValueError("Binary labels must be 0 or 1")
    return x, y


def lr_loss_grad(x, y, w, b):
    z = x @ w + b
    loss = np.mean(np.logaddexp(0.0, z) - y * z)
    error = sigmoid(z) - y
    return float(loss), x.T @ error / len(x), float(error.mean())


def train_lr(x, y, learning_rate=0.1, steps=1000):
    x, y = supervised_data(x, y, binary=True)
    if not np.isfinite(learning_rate) or learning_rate <= 0:
        raise ValueError("Learning rate must be finite and positive")
    if not isinstance(steps, int) or steps < 1:
        raise ValueError("Steps must be a positive integer")
    w, b = np.zeros(x.shape[1]), 0.0
    losses = []
    for _ in range(steps):
        loss, dw, db = lr_loss_grad(x, y, w, b)
        if not np.isfinite(loss) or not np.isfinite(dw).all():
            raise FloatingPointError("Training diverged")
        losses.append(loss)
        w -= learning_rate * dw
        b -= learning_rate * db
    final, _, _ = lr_loss_grad(x, y, w, b)
    if not np.isfinite(final):
        raise FloatingPointError("Training diverged")
    return w, b, losses + [final]


def softmax_ce(logits, y):
    logits, y = supervised_data(logits, y)
    if not np.equal(y, np.floor(y)).all() or np.any(y < 0) or np.any(y >= logits.shape[1]):
        raise ValueError("Labels must be integer class indices")
    y = y.astype(int)
    shifted = logits - logits.max(axis=1, keepdims=True)
    log_probs = shifted - np.log(np.exp(shifted).sum(axis=1, keepdims=True))
    probs = np.exp(log_probs)
    grad = probs.copy()
    grad[np.arange(len(y)), y] -= 1
    return float(-log_probs[np.arange(len(y)), y].mean()), probs, grad / len(y)


def gmm_m_step(x, responsibilities):
    x = np.asarray(x, dtype=float)
    r = np.asarray(responsibilities, dtype=float)
    if x.ndim != 2 or not x.size or r.ndim != 2 or r.shape[0] != len(x) or r.shape[1] == 0:
        raise ValueError("Expected X (n,d) and responsibilities (n,k)")
    if not np.isfinite(x).all() or not np.isfinite(r).all() or np.any(r < 0):
        raise ValueError("Inputs must be finite and responsibilities nonnegative")
    if not np.allclose(r.sum(axis=1), 1.0, atol=1e-8, rtol=0):
        raise ValueError("Each responsibility row must sum to one")
    counts = r.sum(axis=0)
    if np.any(counts <= 0):
        raise ValueError("An empty component needs reinitialization")
    means = r.T @ x / counts[:, None]
    covariances = []
    for k, mean in enumerate(means):
        centered = x - mean
        covariances.append((centered.T * r[:, k]) @ centered / counts[k])
    return counts / len(x), means, np.asarray(covariances)


def two_layer_loss_grad(x, y, w1, b1, w2, b2):
    # tanh avoids nondifferentiable points in the gradient-check example.
    hidden = np.tanh(x @ w1 + b1)
    loss, _, dz = softmax_ce(hidden @ w2 + b2, y)
    dw2, db2 = hidden.T @ dz, dz.sum(axis=0)
    dh = (dz @ w2.T) * (1 - hidden ** 2)
    return loss, (x.T @ dh, dh.sum(axis=0), dw2, db2)


def conv_shape(height, width, in_channels, out_channels, kernel=3, stride=1, padding=0, dilation=1, bias=True):
    values = [height, width, in_channels, out_channels, kernel, stride, dilation]
    if any(not isinstance(v, int) or v <= 0 for v in values) or not isinstance(padding, int) or padding < 0:
        raise ValueError("Dimensions must be positive integers; padding must be nonnegative")
    effective = dilation * (kernel - 1) + 1
    hout = (height + 2 * padding - effective) // stride + 1
    wout = (width + 2 * padding - effective) // stride + 1
    if min(hout, wout) <= 0:
        raise ValueError("Kernel does not fit padded input")
    parameters = out_channels * (in_channels * kernel * kernel + int(bias))
    return (hout, wout, out_channels), parameters


def self_check():
    x = np.array([[-2.0], [-1.0], [1.0], [2.0]])
    y = np.array([0, 0, 1, 1])
    loss, dw, db = lr_loss_grad(x, y, np.zeros(1), 0.0)
    np.testing.assert_allclose([loss, dw[0], db], [np.log(2), -0.75, 0])
    w, b, losses = train_lr(x, y)
    assert losses[-1] < losses[0] and np.array_equal(sigmoid(x @ w + b) >= 0.5, y)
    ce, probs, grad = softmax_ce([[1000, 1000, 1000]], [1])
    np.testing.assert_allclose([ce], [np.log(3)])
    np.testing.assert_allclose(probs.sum(axis=1), 1)
    np.testing.assert_allclose(grad, [[1/3, -2/3, 1/3]])
    pi, means, cov = gmm_m_step([[0], [2]], [[0.75, 0.25], [0.25, 0.75]])
    np.testing.assert_allclose(pi, [0.5, 0.5])
    np.testing.assert_allclose(means[:, 0], [0.5, 1.5])
    np.testing.assert_allclose(cov[:, 0, 0], [0.75, 0.75])
    rng = np.random.default_rng(7)
    nx, ny = rng.normal(size=(3, 2)), np.array([0, 1, 0])
    params = [rng.normal(size=(2, 3)), rng.normal(size=3), rng.normal(size=(3, 2)), rng.normal(size=2)]
    _, gradients = two_layer_loss_grad(nx, ny, *params)
    max_error = 0.0
    for param, analytical in zip(params, gradients):
        for index in np.ndindex(param.shape):
            original = param[index]
            param[index] = original + 1e-5
            plus = two_layer_loss_grad(nx, ny, *params)[0]
            param[index] = original - 1e-5
            minus = two_layer_loss_grad(nx, ny, *params)[0]
            param[index] = original
            max_error = max(max_error, abs((plus - minus) / 2e-5 - analytical[index]))
    assert max_error < 1e-7
    assert conv_shape(32, 32, 3, 16, stride=2, padding=1) == ((16, 16, 16), 448)
    assert conv_shape(7, 7, 2, 4, dilation=2) == ((3, 3, 4), 76)
    invalid = [lambda: train_lr([], []), lambda: train_lr([[1]], [2]),
               lambda: softmax_ce([[1, 2]], [2]), lambda: softmax_ce([[np.nan]], [0]),
               lambda: gmm_m_step([[1]], [[0.5, 0.4]]), lambda: gmm_m_step([[1]], [[1, 0]]),
               lambda: conv_shape(1, 1, 1, 1)]
    for call in invalid:
        try:
            call()
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid input was accepted")
    return {"status": "passed", "lr_initial_loss": losses[0], "lr_final_loss": losses[-1],
            "backprop_max_gradient_error": max_error, "invalid_cases": len(invalid),
            "numpy": np.__version__}


if __name__ == "__main__":
    print(json.dumps(self_check(), indent=2))
