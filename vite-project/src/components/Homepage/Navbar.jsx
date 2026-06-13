import React, { useContext } from "react";
import { HiMenuAlt4 } from "react-icons/hi";
import { AiOutlineClose } from "react-icons/ai";
import { Link, useNavigate } from "react-router-dom";
import { Tooltip } from "react-tooltip";

import { TransactionContext } from "../../context/TransactionContext";

const NavBarItem = ({ title, path, classprops, closeMenu }) => (
  <li className={`mx-4 cursor-pointer ${classprops}`}>
    <Link to={path} onClick={closeMenu}>
      {title}
    </Link>
  </li>
);

const Navbar = () => {
  const [toggleMenu, setToggleMenu] = React.useState(false);
  const { connectWallet, currentAccount, disconnectWallet, isConnectedToSite, isAdmin } =
    useContext(TransactionContext);
  const navigate = useNavigate();

  const handleConnect = async () => {
    try {
      await connectWallet();
      // The user will need to sign a message in MetaMask
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    navigate("/");
  };

  return (
    <nav className="w-full flex md:justify-center justify-between items-center p-4 bg-gray-800 shadow-lg z-50">
      <div className="md:flex-[0.5] flex-initial justify-center items-center text-teal-400 text-3xl font-bold">
        <Link to="/">CRYPTO PORTFOLIO</Link>
      </div>

      {/* Navbar links for larger screens */}
      {isConnectedToSite && (
        <ul className="text-white md:flex hidden list-none flex-row justify-between items-center flex-initial">
          {[
            { title: "Home", path: "/" },
            { title: "Watchlist", path: "/watchlist" },
            { title: "Transfer", path: "/transfer" },
            { title: "Approve Allowance", path: "/approveallowance" },
            { title: "Allowance Check", path: "/allowancecheck" },
            ...(isAdmin ? [{ title: "Admin Panel", path: "/admin" }] : []),
          ].map((item, index) => (
            <NavBarItem key={index} title={item.title} path={item.path} />
          ))}
        </ul>
      )}

      {/* Mobile menu toggle */}
      <div className="flex relative">
        {!toggleMenu ? (
          <HiMenuAlt4
            fontSize={28}
            className="text-white md:hidden cursor-pointer"
            onClick={() => setToggleMenu(true)}
            aria-label="Open menu"
          />
        ) : (
          <AiOutlineClose
            fontSize={28}
            className="text-white md:hidden cursor-pointer"
            onClick={() => setToggleMenu(false)}
            aria-label="Close menu"
          />
        )}

        {toggleMenu && (
          <ul
            className="z-10 fixed top-0 right-0 p-3 w-[70vw] h-screen shadow-2xl md:hidden list-none
            flex flex-col justify-start items-end rounded-md bg-gray-900 text-white animate-slide-in"
          >
            <li className="text-xl w-full my-2">
              <AiOutlineClose
                onClick={() => setToggleMenu(false)}
                aria-label="Close menu"
              />
            </li>
            {isConnectedToSite && [
              { title: "Home", path: "/" },
              { title: "Watchlist", path: "/watchlist" },
              { title: "Transfer", path: "/transfer" },
              { title: "Approve Allowance", path: "/approveallowance" },
              { title: "Allowance Check", path: "/allowancecheck" },
              ...(isAdmin ? [{ title: "Admin Panel", path: "/admin" }] : []),
            ].map((item, index) => (
              <NavBarItem
                key={index}
                title={item.title}
                path={item.path}
                classprops="my-2 text-lg"
                closeMenu={() => setToggleMenu(false)} // Close menu on link click
              />
            ))}
          </ul>
        )}
      </div>

      {/* Wallet Connection Section */}
      <div className="flex items-center space-x-4">
        {isConnectedToSite ? (
          <div className="flex items-center space-x-3 bg-gray-900 bg-opacity-40 border border-gray-700 px-3 py-1.5 rounded-full shadow-inner">
            {/* Pulsating green dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-gray-300 font-mono text-sm font-semibold">{`${currentAccount.slice(
              0,
              6
            )}...${currentAccount.slice(-4)}`}</p>
            <button
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-1.5 px-3 rounded-full transition duration-200"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-3 bg-gray-900 bg-opacity-40 border border-gray-800 px-3 py-1.5 rounded-full">
            {/* Grey dot */}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-600"></span>
            <button
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold py-1 px-4 rounded-full transition duration-200"
              onClick={handleConnect}
              data-tooltip-id="connect-wallet-tooltip"
              data-tooltip-content="Connect your Ethereum wallet to interact with the app"
            >
              Connect Wallet
            </button>
          </div>
        )}
        <Tooltip id="connect-wallet-tooltip" />
      </div>
    </nav>
  );
};

export default Navbar;
